/* Allow extension to interact with page-level JS */

/* 
* file_path: where the JS file is located
* tag: which type of HTML tag to append the script to 
*/
function injectScript(file_path, tag) {
    var node = document.getElementsByTagName(tag)[0]; // Returns list of all elems with specified tag 
    if (!node) {
        console.error(`injectScript: No <${tag}> found in the DOM`);
        return;
    }
    var script = document.createElement('script'); // Creating script elem (to later insert)
    script.setAttribute('type', 'text/javascript'); // Sets to JS
    script.setAttribute('src', file_path); // Determines where to load JS file from 
    node.appendChild(script); // Places into the page 
}

// Once page is finished loading 
document.addEventListener('DOMContentLoaded', () => {
    // Styling for injected elements
    const styleLink = document.createElement("link")
    styleLink.rel = "stylesheet"
    styleLink.href = chrome.runtime.getURL("injected.css")
    document.head.appendChild(styleLink)

    // Once page is finished loading -> injects + runs 'injected.js' into webpage 
    // NOTE: injected.js should be the script that would be run as JS func in dev tools console 
    injectScript(chrome.runtime.getURL('injected.js'), 'body');
})