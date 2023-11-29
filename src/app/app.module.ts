import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { BodySegmentationComponent } from './body-segmentation/body-segmentation.component';

@NgModule({
  declarations: [AppComponent, BodySegmentationComponent],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
