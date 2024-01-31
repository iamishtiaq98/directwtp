const express = require("express");
const app = express();
const { join: pathJoin } = require("path");
const port = process.env.PORT || 3000;
const logger = require("morgan");
const bodyParser = require("body-parser");
const { SitemapStream, streamToPromise } = require("sitemap");
const { createGzip } = require("zlib");
const cookieParser = require("cookie-parser");

const geoip = require('geoip-lite');



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
  res.locals.titleweb = "DirectWTP";
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

app.use((req, res) => res.status(404).render("404"))

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
