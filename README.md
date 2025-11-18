**Installation Instructions**
- In order to install this extension, go to "chrome://extensions/" and toggle the switch to enter Developer mode.
- Click "Load Unpacked" and select the folder containing the full extension contents.
- The extension is now installed.

Tabnabbing is a phishing attack that targets users with multiple browser tabs open, using a malicious link to replace the content of an inactive tab with a fake version of a legitimate website. When the user returns to the now-compromised tab, the site can trick them into entering credentials on a phishing page that looks identical to the original site, but is controlled by an attacker.

This a very basic tabnab detector. It will also detect things like videos playing in background tabs because it detects any and all changes to the appearance above a 5% threshold.

This extension uses Manifest V3 and the most open permission required is <all_urls> for hosts which is required to take the screenshots used in detection.

When Tabnabbing is detected, the relevent regions are highlighted in red on the screen, and an Alert icon appears on the extension icon (ideally pinned). 
The extension icon is a red dot in white box. The red highlight and Alert icon can be cleared by clicking the extension icon.
Screenshots are taken of the active tab every 1.5s and the latest screenshot from each tab is stored by chrome storage. When a tab is reactivated, it compares its current screenshot to the last saved one and then highlights the differences.

A screenshot of the functionality is located in the top level of the folder named: "Screenshot.png"

This was originally created as a school project and has been expanded upon slightly.
