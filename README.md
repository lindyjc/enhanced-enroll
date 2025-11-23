# Enhanced Enroll: A UW-Madison Course Search & Enroll extension
## Inspiration
We set out to build the enrollment experience we genuinely wish we had ourselves: a unified, thoughtful, and modern layer on top of the existing platform that makes scheduling easier for everyone on campus.

## What it does
- Integrates Rate My Professor and Madgrades data seamlessly into course search results. Students can view instructor ratings, grade distributions, and past difficulty without leaving the page.
- Adds a real-time schedule compatibility checker: if a class section conflicts with a course already in your schedule, the extension automatically highlights it in red.
- Everything stays within the enrollment page—no more switching tabs, copying course codes, or losing your place.

## How we built it
- JavaScript, HTML, and CSS for the frontend 
- Chrome Extension Manifest V3 for scripting, permissions, and content injection
- Content scripts to dynamically insert new UI elements 
- Dynamic ES module imports to load our data handlers 
- APIs and scraping techniques to fetch data
- DOM observation to detect loads or updates in webpage UI

## Challenges we ran into
- Cross-origin restrictions: Fetching data from sites like RMP and Madgrades within a content script caused CORS issues we had to work around through background script requests.
- Injecting modules into a non-module page: Modern ES module imports don’t play nicely with older university web pages, so loading external scripts required careful design.
- Dynamic page loading: The enrollment platform uses client-side rendering, so elements weren’t always in the DOM when we needed them—forcing us to use MutationObservers.
- Time conflict logic: Accounting for all section types (lectures, discussions, labs) and edge cases was trickier than it looked.
- UI integration: Making our injected elements look native while still being clearly useful took multiple iterations.

## What's next for ENHANCED ENROLL
- A mobile companion version or Safari/Firefox ports
- Implement a search filter for dates/times of classes

