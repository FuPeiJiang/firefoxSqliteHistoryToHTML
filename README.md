go in index.js and edit your paths:<br>
where is `places.sqlite` ?<br>
where is `favicons.sqlite` ?

do you want to only extract a RANGE ? <br>
`rangeNewestUrl`<br>
`rangeOldestUrl`

if Favicon is missing, do you want to download them(get the links)<br> using `require('get-website-favicon')` ?<br>
(slow: use when you only have a few links)

by default, it will output to `${__dirname}/sessionBuddy.html`

___
node_modules are committed to save time
