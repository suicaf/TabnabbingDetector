Installation Instructions
- In order to install this extension, go to "chrome://extensions/" and toggle the switch to enter Developer mode.
- Click "Load Unpacked" and select the folder containing the full extension contents.
- The extension is now installed.

This extension uses Manifest V3 and the most open permission required is <all_urls> for hosts which is required to take the screenshots used in detection.

When Tabnabbing is detected, the relevent regions are highlighted in red on the screen, and an Alert icon appears on the extension icon (ideally pinned). 
The extension icon is a red dot in white box. The red highlight and Alert icon can be cleared by clicking the extension icon.
Screenshots are taken of the active tab every 1.5s and the latest screenshot from each tab is stored by chrome. When a tab is reactivated, it compares its current screenshot to the last saved one and then highlights the differences.

A screenshot of the functionality is located in the top level of the folder named: "Screenshot.png"