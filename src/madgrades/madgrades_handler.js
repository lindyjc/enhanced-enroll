import { config } from './config.js'

const api_key = config.API_KEY;
// const api_key = ENHANCED_ENROLL_CONFIG.API_KEY;

function getCourseTitle(str) {
    // return some course title? (abbrev + number) e.g "COMP SCI 564"
    return { abbrev, number }
}

export async function test() {
    const abbrev = "COMP SCI";
    const number = "564";

    const courseurl = await getCourseUrl(abbrev, number);
    // console.log(courseurl)

    const avgGPA = await getAvgGPA(courseurl);
    const gradeCounts = await getGradeCounts(courseurl)
    console.log("Average GPA:", avgGPA);
    console.log("grade counts:", gradeCounts);
}

/**
 * TODO
 * @param {string} abbrev course abbreviation (e.g. "COMP SCI")
 * @param {string} number course number (e.g. "564")
 * @returns 
 */
export async function getCourseUrl(abbrev, number) {
    const query = `${abbrev} ${number}`;
    const response = await fetch(`https://api.madgrades.com/v1/courses?query=${encodeURIComponent(query)}
`, {
        headers: {
            "Authorization": `Token token=${api_key}`
        }
    });
    const json = await response.json();
    // console.log(json);
    // console.log(json.results[0].subjects);
    // console.log(json.subjects)
    
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
    // total = g.aCount + g.abCount + g.bCount + g.bcCount + g.cCount + g.dCount + g.fCount
    return [(g.aCount / total * 100).toFixed(2) + "%",
    (g.abCount / total * 100).toFixed(2) + "%",
    (g.bCount / total * 100).toFixed(2) + "%",
    (g.bcCount / total * 100).toFixed(2) + "%",
    (g.cCount / total * 100).toFixed(2) + "%",
    (g.dCount / total * 100).toFixed(2) + "%",
    (g.fCount / total * 100).toFixed(2) + "%",]
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
    // console.log(grades)
    // const grades_json = JSON.parse(grades);
    const g = grades?.cumulative;
    // console.log(cum_grades)

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


export async function displayGraph(abbrev, number) {

    const r = 0;
    const g = 0;
    const b = 0;
    const color = 'rgb(' + r + ',' + g + ',' + b + ')';
    const colorTemplate = `rgb(${r},${g},${b})`;
    // const abbrev = "COMP SCI" // get these from somewhere in the future
    // const number = "577"
    const courseurl = await getCourseUrl(abbrev, number)
    const grade_counts = await getGradeCounts(courseurl)
    const grade_per = await getGradePercents(courseurl)
    const avgGPA = await getAvgGPA(courseurl)
    const letter_grades = ['A', 'AB', 'B', 'BC', 'C', 'D', 'F']
    const x_lab = 'Cumulative: ' + avgGPA
    var layout = {
        xaxis: {
            title: {
                text: x_lab,
                font: {
                    family: 'Courier New, monospace',
                    size: 15,
                    color: color
                }
            },
        },
        yaxis: {
            title: { text: "Students (%)", },
            range: [0, 100]
        }
    }

    var trace1 = {
        x: letter_grades,
        y: grade_per,
        type: 'bar',
        marker: {
            color: color
        },
        // hoverinfo: 'none',
        text: grade_per.map(String),
        hovertemplate: '%{customdata}<extra></extra>',
        customdata: grade_counts.map((count, i) =>
            `${count} students`
        )
    }
    var data = [trace1]

    Plotly.newPlot('madgrades-plot', data, layout);
}