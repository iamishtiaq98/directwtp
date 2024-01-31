const express = require("express");
const app = express();
const { join: pathJoin } = require("path");
const port = process.env.PORT || 3000;
const logger = require("morgan");
const bodyParser = require("body-parser");
const { SitemapStream, streamToPromise } = require("sitemap");
const { createGzip } = require("zlib");
const cookieParser = require("cookie-parser");
const tiktok = require("./tiktok-url-handler");

const geoip = require('geoip-lite');

const mailer = require("nodemailer");
let transporter = mailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'muhammadishtiaqamjad@gmail.com',
    pass: 'eadegvfldwpgoukz',
  },
});

const ROOT = pathJoin(__dirname, "views");
const STATIC_ROOT = pathJoin(__dirname, "public");
var useragent = require('express-useragent');

app.set("views", ROOT);
app.set("view engine", "ejs");
app.set("trust proxy", true);
app.set("json spaces", 2);

app.use(logger("dev"));
app.use(cookieParser());
app.use(useragent.express());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(STATIC_ROOT));

app.use(async (req, res, next) => {
  res.locals.titleweb = "cliptick";
  res.locals.req = req;
  res.locals.ipAddr = req.headers["cf-connecting-ip"] || req.ip;
  res.locals.ua = req.useragent;
  res.locals.speeds = Date.now();
  const geo = geoip.lookup(res.locals.ipAddr);
  res.locals.country = geo ? geo.country : 'Unknown';
  next();
});

app.get(["/", "/index.html"], async (req, res) => {
  res.redirect("/en");
});

app.get("/headers", (req, res) => {
  res.send(req.headers);
  console.log(res.headers)
})

app.get("/ua", (req, res) => {
  res.send(req.useragent);
})

app.get("/en", async (req, res) => {
  res.cookie("lang", "EN", { maxAge: 900000, httpOnly: true });
  const errorMessage = req.query.error || null;
  res.render("en", { error: errorMessage });
});

app.post("/download", async (req, res) => {
  const url = req.body._qgB

    if (!!url) {
      let result = await tiktok.getVideoInfo(url);
      res.render("download", { result: result });
    } else {
      res.render("en", { error: "Please enter a valid URL" });
    }

});

app.get("/about", async (req, res) => {
  res.render("about");
});

app.get("/contact", async (req, res) => {
  res.render("contact");
});

app.get("/privacy", async (req, res) => {
  res.render("privacy");
});

app.get("/terms", async (req, res) => {
  res.render("terms");
});

app.post("/contact", async (req, res) => {
  try {
    let { name, email, message } = req.body;
    let mail = {
      from: name,
      to: "muhammadishtiaqamjad@gmail.com",
      subject: "ClipTick Contact",
      text: `===== ClipTick Contacts =====\n\nFrom: ${email}\nName: ${name}\nMessage: ${message}\n\n===== Automated Send Mail =====`,
    };

    await transporter.sendMail(mail);
    res.render("contact", { success: true })
  } catch (err) {
    console.log(err);
    res.render("contact", { success: false })
  }
});

app.get("/sitemap.xml", async (req, res) => {
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Content-Encoding", "gzip");
  let pathall = [];
  app._router.stack.forEach(function (r) {
    if (r.route && r.route.path) {
      if (typeof r.route.path == "object") {
        r.route.path.map((path) => {
          pathall.push(path);
        });
      } else {
        pathall.push(r.route.path);
      }
    }
  });

  const smStream = new SitemapStream({
    hostname: req.protocol + "://" + req.host,
  });
  const pipeline = smStream.pipe(createGzip());
  pathall.filter((path) => {
    if (path !== "/sitemap.xml" && path !== "/allpathroute" && path !== "/download" && path !== "/robots.txt" && path !== "/headers" && path !== "/ua" && path !== "/") {
      smStream.write({ url: path, changefreq: "daily", priority: 0.9 });
    }
  });
  smStream.end();
  streamToPromise(pipeline).then((sm) => res.send(sm));
});

app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(
    "User-agent: *\nAllow: /\nSitemap: " +
    req.protocol +
    "://" +
    req.host +
    "/sitemap.xml"
    );
});

app.use((req, res) => res.status(404).render("404"))

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
