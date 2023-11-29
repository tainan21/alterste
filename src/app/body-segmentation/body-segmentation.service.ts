import { Injectable } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import * as bodyPix from '@tensorflow-models/body-pix';
import { ModelConfig, PersonInferenceConfig } from '@tensorflow-models/body-pix/dist/body_pix_model';
import { BehaviorSubject, Observable } from 'rxjs';

// An object to configure parameters to set for the bodypix model.
// See github docs for explanations.
const bodyPixProperties: ModelConfig = {
  architecture: 'MobileNetV1',
  outputStride: 16,
  multiplier: 0.75,
  quantBytes: 4
};

// An object to configure parameters for detection. I have raised
// the segmentation threshold to 90% confidence to reduce the
// number of false positives.
const segmentationProperties: PersonInferenceConfig = {
  flipHorizontal: false,
  internalResolution: 'high',
  segmentationThreshold: 0.9
};

@Injectable({
  providedIn: 'root'
})
export class BodySegmentationService {
  private _readyState: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public readonly isReady$: Observable<boolean> = this._readyState.asObservable();

  private _segmentationState: BehaviorSubject<bodyPix.SemanticPartSegmentation> = new BehaviorSubject(undefined);
  public readonly segmentation$: Observable<bodyPix.SemanticPartSegmentation> = this._segmentationState.asObservable();

  model: bodyPix.BodyPix;

  constructor() {
    tf.setBackend('webgl');

    // Let's load the model with our parameters defined above.
    // Before we can use bodypix class we must wait for it to finish
    // loading. Machine Learning models can be large and take a moment to
    // get everything needed to run.
    bodyPix.load(bodyPixProperties).then(loadedModel => {
      this.model = loadedModel;
      this._readyState.next(true);
    });
  }

  public segmentPersonParts(input): void {
    this.model.segmentPersonParts(input, segmentationProperties).then((parts: bodyPix.SemanticPartSegmentation) => {
      this._segmentationState.next(parts);
    });
  }
}
