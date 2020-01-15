const puppeteer = require('puppeteer');

async function scrapeStuff(url, user, pass) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url); // Waits until page load

    await page.click('#student'); // Select student search

    const [nextButton] = await page.$x('/html/body/div[3]/div/div[1]/form/span/div[4]/span/input'); // Select 'Next'
    await Promise.all([
        await nextButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    // Logging in

    await page.type('#userNameInput', user);
    await page.type('#passwordInput', pass);

    await page.click('#submitButton')
    
    console.log('done');

    browser.close();
}

const args = process.argv.slice(2);
if (args.length == 2) {
    const userName = args[0];
    const password = args[1];
    scrapeStuff('https://directory.nku.edu/', userName, password);
} else {
    console.log('Must provide user name & password. Ex: node path "bob" "pass123"');
}