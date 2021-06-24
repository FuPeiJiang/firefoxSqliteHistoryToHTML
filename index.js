const d = console.debug.bind(console)
const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const getFavicons = require('get-website-favicon')

let placesSqlite, faviconsSqlite, rangeNewestUrl, saveToPath, rangeOldestUrl, downloadMissingFavicons

placesSqlite = String.raw`places.sqlite`
faviconsSqlite = String.raw`favicons.sqlite`

rangeNewestUrl = 'https://github.com/FuPeiJiang/firefoxSqliteHistoryToHTML'
rangeOldestUrl = 'https://github.com/FuPeiJiang/firefoxSqliteHistoryToHTML'
downloadMissingFavicons = true


firefoxSqliteHistoryToHTML(placesSqlite, faviconsSqlite, saveToPath, rangeNewestUrl, rangeOldestUrl, downloadMissingFavicons)

function firefoxSqliteHistoryToHTML(placesSqlite, faviconsSqlite, saveToPath=`${__dirname}/sessionBuddy.html`, rangeNewestUrl, rangeOldestUrl) {

  const favDb = new sqlite3.Database(faviconsSqlite)

  favDb.serialize(async function () {

    function iconUrlFromUrl(url) {
      return new Promise(resolve => {

        favDb.get(`SELECT icon_url FROM moz_icons WHERE id=( SELECT icon_id FROM moz_icons_to_pages WHERE page_id=( SELECT id FROM moz_pages_w_icons WHERE page_url=? ) )`, url, function (err, table) {
          resolve(table)
          return
        })

      })
    }

    const db = new sqlite3.Database(placesSqlite)

    db.serialize(function () {

      db.all("SELECT * FROM moz_places WHERE title IS NOT NULL ORDER BY last_visit_date DESC", async function (err, table) {

        let slicedArr
        if (rangeNewestUrl && rangeOldestUrl) {
          const tableLen = table.length
          let index1
          for (let i = 0; i < tableLen; i++) {
            if (table[i].url === rangeNewestUrl) {
              index1 = i
              break
            }
          }
          for (let i = index1 + 1; i < tableLen; i++) {
            if (table[i].url === rangeOldestUrl) {
              slicedArr = table.slice(index1, i + 1)
              break
            }
          }
        } else {
          slicedArr = table
        }

        const promiseArr = []
        for (let i = 0, len = slicedArr.length; i < len; i++) {
          promiseArr.push((i => {
            return new Promise(async resolve => {
              const obj = slicedArr[i]
              // https://stackoverflow.com/questions/5775469/whats-the-valid-way-to-include-an-image-with-no-src#5775621
              if (obj.url.startsWith('https://www.google.com/search?')) {
                resolve(`<li><img src="https://www.google.com/favicon.ico"><a href="${obj.url}">${obj.title || obj.url}</a></li>`)
                return
              } else {
                const iconUrlObj = await iconUrlFromUrl(obj.url)
                if (iconUrlObj) {
                  resolve(`<li><img src="${iconUrlObj.icon_url}"><a href="${obj.url}">${obj.title || obj.url}</a></li>`)
                  return
                } else {
                  if (downloadMissingFavicons) {
                    d(`getFavicons: ${obj.url}`)
                    const favIconObj = await getFavicons(obj.url)
                    const iconsArr = favIconObj.icons
                    if (iconsArr.length) {
                      resolve(`<li><img src="${iconsArr[iconsArr.length - 1].src}"><a href="${obj.url}">${obj.title || obj.url}</a></li>`)
                      return
                    }
                  }
                  resolve(`<li><img src="//:0"><a href="${obj.url}">${obj.title || obj.url}</a></li>`)
                  return
                }
              }
            })
          })(i))

        }
        Promise.all(promiseArr).then(imagesAndLinksHTMLArr => {
          const finalText =
            `<head>
  <style>
    ul { list-style-type:none; }
    li { white-space:nowrap; padding:3px 0; }
    a { text-decoration:none; vertical-align:middle; color:black; font-family:'Roboto', Arial, Helvetica, sans-serif; font-size:13px; }
    a:hover { text-decoration:underline; }
    img { height:16px; width:16px; margin-right:12px; vertical-align:middle; }
  </style>
</head>
<body>
  <ul>
    ${imagesAndLinksHTMLArr.join('\n    ')}
  </ul>
  <script>
  arr=document.getElementsByTagName('a')
  for (let i = 0, len = arr.length; i < len; i++) {
    arr[i].setAttribute('target','_blank')
  }
  </script>
</body>`

          fs.writeFileSync(saveToPath, finalText)

          db.close()
          favDb.close()
        })

      })

    })

  })
}
