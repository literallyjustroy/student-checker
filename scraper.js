const puppeteer = require('puppeteer');
const fs = require('fs');

const studentDirectory = 'https://directory.nku.edu/student';
const credentialsFileName = 'credentials.txt';

// Gets username and password from credentials file
function getCreds(fileName) {
    const rawTxt = fs.readFileSync(fileName, "utf8");
    return rawTxt.split(/\r\n|\n/);
}

// Returns a list of lists containing student's first and last names
async function getNames(fileName) {
    let studentsNames = [];
    const rawTxt = fs.readFileSync(fileName, "utf8");
    const combinedNames = rawTxt.split(/\r\n|\n/);
    for (let i = 0; i < combinedNames.length; i++) {
        studentsNames.push(combinedNames[i].split(' '));
    }

    return studentsNames;
}

async function lookupStudent(page, firstName, lastName) {
    await page.$eval('#firstname', (el, value) => el.value = value, firstName); // sets text instead of typing
    await page.$eval('#lastname', (el, value) => el.value = value, lastName);

    const [searchButton] = await page.$x('//*[@id="searchButton"]');
    await Promise.all([
        await searchButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    const [result] = await page.$x('/html/body/div[3]/div/div/p/span');
    const txt = await result.getProperty('textContent');
    const rawTxt = await txt.jsonValue();

    return rawTxt !== 'Directory search results - 0 Records Found';

}

async function scrapeStuff(url, user, pass) {
    const studentNames = await getNames('students.txt');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url); // Waits until page load

    // Logging in

    await page.$eval('#userNameInput', (el, value) => el.value = value, user);
    await page.$eval('#passwordInput', (el, value) => el.value = value, pass);

    await Promise.all([
        await page.click('#submitButton'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    console.log("Authentication complete");

    // Student lookups

    for (let i = 0; i < studentNames.length; i++) {
        const firstName = studentNames[i][0];
        const lastName = studentNames[i][1];

        const studentExists = await lookupStudent(page, firstName, lastName);
        await page.goBack();

        if (!studentExists) {
            console.log(`${firstName} ${lastName} isn't in the Student Directory`)
        }
    }

    // Close browser/program
    await browser.close();
}

const args = process.argv.slice(2);
if (args.length === 2) { // Get credentials from command line
    const userName = args[0];
    const password = args[1];
    scrapeStuff(studentDirectory, userName, password);
} else if (args.length === 0) { // Get credentials from credentials.txt
    const creds = getCreds(credentialsFileName);
    if (creds.length >= 2) {
        const userName = creds[0];
        const password = creds[1];
        scrapeStuff(studentDirectory, userName, password);
    } else {
        console.log('Failure: Either provide NKU user and password as arguments, or as the first and second line in a credentials.txt file');
    }
} else {
    console.log('Failure: Only 0 or 2 arguments supported');
}