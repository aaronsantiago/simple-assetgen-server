
import fs from 'fs';
import cors from "cors";
import process from "process";
import express from "express";
import { Readable } from "stream";
import { finished } from "stream/promises";

let sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const app = express();

let configPath = "config.json";
if (process.argv.length > 2) {
  configPath = process.argv[2];
}
let config = JSON.parse(fs.readFileSync(configPath, "utf8"));
console.log(config);

app.use(express.json({limit: "500mb"})); // for parsing application/json
app.use(express.urlencoded({limit: "500mb"}));
app.use(cors());

let assetId = 0;
async function handleRequest(req, res, method) {

  try {
    console.log("executing request", config.destinationServer + req.url);
    let modifiedHeaders = {...req.headers};

    delete modifiedHeaders["content-length"];

    let modifiedBody = {};

    for (let key of Object.keys(req.body)) {
      if (!key.startsWith("snq")) {
        modifiedBody[key] = req.body[key];
      }
    }
    let params =
    {
      method: method,
      headers: modifiedHeaders,
    };

    if (method != "GET") {
      params.body = JSON.stringify(modifiedBody)
    }

    let filename = config.filenamePrefix + Date.now() + "-" + ("0000" + assetId++).slice(-2) + "." + config.fileExtension;
    let filepath = config.directory + "/" + filename;

    const stream = fs.createWriteStream(filepath);
    let response = await fetch(
      "http" + (config.useHttps ? "s" : "") +  "://" + config.destinationServer + req.url,
      params
    );
    // let blob = await response.blob();
    // res.send(Buffer.from(await blob.arrayBuffer()));
    //
    await finished(Readable.fromWeb(response.body).pipe(stream));

    res.send(filename);
  }
  catch (e) {
    console.log("error with request");
    console.log(e);
    res.end("error");
  }
}

app.post("*", (req, res) => {
  handleRequest(req, res, "POST");
});

app.get("*", (req, res) => {
  handleRequest(req, res, "GET");
});

app.put("*", (req, res) => {
  handleRequest(req, res, "PUT");
});

app.options("*", (req, res) => {
  handleRequest(req, res, "OPTIONS");
});

let port = config.port;
app.listen(port, () => {
  console.log(`simple-assetgen-server listening on port ${port}`);
});
