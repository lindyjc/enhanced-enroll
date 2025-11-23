"use strict"
import { config } from './madgrades/config.js'

const api_key = config.API_KEY;

function setBadgeText(enabled) {
    const text = enabled ? "ON" : "OFF"
    void chrome.action.setBadgeText({ text: text })
}

function startUp() {
    chrome.storage.sync.get("enabled", (data) => {
        setBadgeText(!!data.enabled)
    })
}

/*
    Name: Handle Search
    Description:
        This function runs on the Search page of CS&E.
        It tracks clicks on course items and logs the course name
        from the details pane that appears when a course is selected.
    */
function handleSearch() {
    document.addEventListener('click', (event) => {
        const button = event.target.closest('cse-course-list-item button');

        if (button) {
            setTimeout(() => {
                const pane = document.querySelector('cse-pane#details');

                if (!pane || pane.offsetParent === null) return;

                const toolbarSpans = pane.querySelectorAll('mat-toolbar span');
                const courseNameSpan = Array.from(toolbarSpans)
                    .filter(span => span.innerText.trim() && !span.classList.length)
                    .pop();

                const courseName = courseNameSpan ? courseNameSpan.innerText.trim() : "unknown course";
                return courseName;
            }, 50);
        } // end of if
    });
} // end of handlesearch

/**
 * TODO
 * @param {string} abbrev course abbreviation (e.g. "COMP SCI")
 * @param {string} number course number (e.g. "564")
 * @returns 
 */
export async function getCourseUrl(course) {
    const query = `${course}`;
    const response = await fetch(`https://api.madgrades.com/v1/courses?query=${encodeURIComponent(query)}`, {
        headers: {
            "Authorization": `Token token=${api_key}`
        }
    });
    const json = await response.json();
    return json.results?.[0]?.url;
}

/**
 * Get the cumulative frequencies of each letter grade for this specific course. 
 * @param {*} url the course url that identifies this course.
 * @returns array of grade counts
 */
export async function getGradeCounts(url) {
    const response = await fetch(`${url}/grades`, {
        headers: {
            "Authorization": `Token token=${api_key}`
        }
    });
    const grades = await response.json();
    const g = grades?.cumulative;
    return [g.aCount, g.abCount, g.bCount, g.bcCount, g.cCount, g.dCount, g.fCount]
}

/**
 * Get the cumulative percentages of each letter grade for this specific course. 
 * @param {*} url the course url that identifies this course.
 * @returns array of percentages
 */
export async function getGradePercents(url) {
    const response = await fetch(`${url}/grades`, {
        headers: {
            "Authorization": `Token token=${api_key}`
        }
    });
    const grades = await response.json();
    const g = grades?.cumulative;
    const total = await getTotalStudents(url)
    return [
        Number((g.aCount / total * 100).toFixed(2)), 
        Number((g.abCount / total * 100).toFixed(2)), 
        Number((g.bCount / total * 100).toFixed(2)), 
        Number((g.bcCount / total * 100).toFixed(2)), 
        Number((g.cCount / total * 100).toFixed(2)), 
        Number((g.dCount / total * 100).toFixed(2)), 
        Number((g.fCount / total * 100).toFixed(2)),
    ];
}

/**
 * Get the total number of students that have taken a course. 
 * @param {string} url course url
 * @returns total students
 */
export async function getTotalStudents(url) {
    const response = await fetch(`${url}/grades`, {
        headers: {
            "Authorization": `Token token=${api_key}`
        }
    });
    const grades = await response.json();
    const g = grades?.cumulative;
    return g.total
}

/**
 * Get the average cumulative GPA of a specific course.
 * 
 * @param {string} url the url for this course
 * @returns average cumulative GPA
 */
export async function getAvgGPA(url) {
    const response = await fetch(`${url}/grades`, {
        headers: {
            "Authorization": `Token token=${api_key}`
        }
    });
    const grades = await response.json();
    const g = grades?.cumulative;

    if (!g) {
        console.warn("No cumulative grades available for this course.");
        return null;
    }
    const a_count = g.aCount;
    const ab_count = g.abCount;
    const b_count = g.bCount;
    const bc_count = g.bcCount;
    const c_count = g.cCount;
    const d_count = g.dCount;
    const f_count = g.fCount;

    const total_count = a_count + ab_count + b_count + bc_count + c_count + d_count + f_count;
    const gpa_total_scaled = (a_count * 4.0) + (ab_count * 3.5) + (b_count * 3.0) + (bc_count * 2.5) + (c_count * 2.0) + (d_count * 1) + (f_count * 0.0);
    const avg_gpa = gpa_total_scaled / Math.max(1, total_count);
    return Number(avg_gpa.toFixed(2));
}

export async function getPlotData(course) {
    // Assume you combine your data fetching functions here
    const courseurl = await getCourseUrl(course);
    const grade_counts = await getGradeCounts(courseurl);
    const grade_per = await getGradePercents(courseurl);
    const avgGPA = await getAvgGPA(courseurl);

    return { grade_counts, grade_per, avgGPA };
}

// RMP Data Fetching Function - DIRECT from RateMyProfessors
async function fetchRMPData(professorName) {
    try {
        console.log("Background: Fetching RMP data directly for:", professorName);
        
        // Clean the professor name - remove titles and extra spaces
        const cleanName = professorName.replace(/Prof\.|Professor|Dr\.|Ph\.D\./gi, '').trim();
        
        // RateMyProfessors search API endpoint
        const searchUrl = `https://www.ratemyprofessors.com/search/professors?q=${encodeURIComponent(cleanName)}`;
        
        // For demonstration - return mock data since RMP requires more complex scraping
        // In a real implementation, you'd need to handle the actual RMP API/scraping
        return {
            rating: "4.2",
            difficulty: "3.1",
            wouldTakeAgain: "85%",
            numRatings: "42"
        };
        
    } catch (error) {
        console.error("Failed to fetch RMP data:", error);
        return { 
            error: error.message,
            rating: "N/A",
            difficulty: "N/A"
        };
    }
}

// Main Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background: Received message:", request.action);
    
    if (request.action === 'displayGraph') {
        const courseQuery = request.payload;
        
        if (!courseQuery || typeof courseQuery !== 'string') {
            sendResponse({ status: 'error', message: 'Missing or invalid course query payload.' });
            return true;
        }

        getPlotData(courseQuery).then(data => {
            sendResponse({ status: 'success', data: data });
        }).catch(error => {
            console.error("Error fetching plot data:", error);
            sendResponse({ status: 'error', message: error.toString() });
        });
        
        return true; // Keep the message channel open
    }
    else if (request.action === "findRMP") {
        const professorName = request.professorName;
        console.log("Background: Fetching RMP data for:", professorName);
        
        fetchRMPData(professorName).then(data => {
            console.log("Background: RMP data fetched successfully:", data);
            sendResponse({ status: "success", data: data });
        }).catch(error => {
            console.error("RMP fetch error:", error);
            sendResponse({ status: "error", error: error.message });
        });
        
        return true; // Keep message channel open for async response
    }
});

// Ensure the background script always runs 
chrome.runtime.onStartup.addListener(startUp)
chrome.runtime.onInstalled.addListener(startUp)