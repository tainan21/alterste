import { Component, ElementRef, QueryList, Renderer2, ViewChild, ViewChildren } from '@angular/core';
import * as bodyPix from '@tensorflow-models/body-pix';
import { Subscription } from 'rxjs';
import { BodySegmentationService } from './body-segmentation.service';

@Component({
  selector: 'app-body-segmentation',
  templateUrl: './body-segmentation.component.html',
  styleUrls: ['./body-segmentation.component.css']
})
export class BodySegmentationComponent {
  viewMode: 'image' | 'webcam' = 'image';
  subscription: Subscription;

  sampleImages = [
    'https://cdn.glitch.com/ff4f00ae-20e2-4bdc-8771-2642ee05ae93%2Fjj.jpg?v=1581963497215',
    'https://cdn.glitch.com/ff4f00ae-20e2-4bdc-8771-2642ee05ae93%2Fwalk.jpg?v=1581963497392'
  ];
  segmentations: bodyPix.SemanticPartSegmentation[];

  @ViewChildren('imageCanvas', { read: ElementRef }) imageCanvases: QueryList<ElementRef>;

  @ViewChild('webcam', { read: ElementRef }) webcamElement: ElementRef;
  @ViewChild('webcamCanvas', { read: ElementRef }) webcamCanvasElement: ElementRef;
  previousSegmentationComplete = true;

  videoRenderCanvas;
  videoRenderCanvasCtx;

  constructor(private renderer: Renderer2, public bodySegmentationService: BodySegmentationService) {
    this.segmentations = this.sampleImages.map(sample => undefined);
  }

  setViewMode(newMode) {
    this.viewMode = newMode;

    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  onImageClick(event, index) {
    if (this.segmentations[index]) {
      return;
    }

    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }

    this.subscription = this.bodySegmentationService.segmentation$.subscribe((parts: bodyPix.SemanticPartSegmentation) => {
      if (!parts) return;

      this.segmentations[index] = parts;

      const canvas = this.imageCanvases.toArray()[index].nativeElement;
      canvas.width = parts.width;
      canvas.height = parts.height;

      this.processSegmentation(canvas, parts);
    });

    this.bodySegmentationService.segmentPersonParts(event.target);
  }

  // render returned segmentation data to a given canvas context.
  private processSegmentation(canvas, segmentation) {
    // The colored part image is an rgb image with a corresponding color from the rainbow colors
    // for each part at each pixel, and black pixels where there is no part.
    const coloredPartImage = bodyPix.toColoredPartMask(segmentation);

    // Draw the colored part image on top of the original image onto a canvas.
    // The colored part image will be drawn semi-transparent, with an opacity of 0.7,
    // allowing for the original image to be visible under.
    const opacity = 0.7;
    const flipHorizontal = false;
    const maskBlurAmount = 0;
    bodyPix.drawMask(canvas, canvas, coloredPartImage, opacity, maskBlurAmount, flipHorizontal);
  }

  // Check if webcam access is supported.
  hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  // Enable the live webcam view and start classification.
  enableCam() {
    // We will also create a tempory canvas to render to that is in memory only
    // to store frames from the web cam stream for classification.
    this.videoRenderCanvas = document.createElement('canvas');
    this.videoRenderCanvasCtx = this.videoRenderCanvas.getContext('2d');

    // getUsermedia parameters.
    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    };

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      const webcamEl = this.webcamElement.nativeElement;
      this.renderer.setProperty(webcamEl, 'srcObject', stream);

      this.renderer.listen(webcamEl, 'loadedmetadata', () => {
        // Update widths and heights once video is successfully played otherwise
        // it will have width and height of zero initially causing classification to fail.
        this.renderer.setProperty(this.webcamCanvasElement.nativeElement, 'width', webcamEl.videoWidth);
        this.renderer.setProperty(this.webcamCanvasElement.nativeElement, 'height', webcamEl.videoHeight);
        this.videoRenderCanvas.width = webcamEl.videoWidth;
        this.videoRenderCanvas.height = webcamEl.videoHeight;
      });

      this.subscription = this.bodySegmentationService.segmentation$.subscribe((parts: bodyPix.SemanticPartSegmentation) => {
        if (parts) {
          this.processSegmentation(this.webcamCanvasElement.nativeElement, parts);
        }
        this.previousSegmentationComplete = true;
      });

      this.renderer.listen(webcamEl, 'loadeddata', () => this.predictWebcam());
    });
  }

  predictWebcam() {
    if (this.previousSegmentationComplete && this.webcamCanvasElement) {
      this.previousSegmentationComplete = false;
      // Copy the video frame from webcam to a tempory canvas in memory only (not in the DOM).
      this.videoRenderCanvasCtx.drawImage(this.webcamElement.nativeElement, 0, 0);
      // Now classify the canvas image we have available.
      this.bodySegmentationService.segmentPersonParts(this.videoRenderCanvas);
    }
    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(this.predictWebcam.bind(this));
  }
}
