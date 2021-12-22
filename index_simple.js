
const { S3Client, ListObjectsCommand} = require("@aws-sdk/client-s3")
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post")
const uniqid = require("uniqid")
var FormData = require('form-data');
var fs = require('fs');
const fetch = require("node-fetch")

require('dotenv').config();

async function testS3() {

    const s3Client = new S3Client({ endpoint: process.env.AWS_ENDPOINT, region: process.env.AWS_REGION_NAME });

    // list objects to ensure we have access
    const listObjectsCmd = new ListObjectsCommand({Bucket: process.env.AWS_CONTAINER_NAME})
    const response = await s3Client.send(listObjectsCmd);

    console.log(" * Got objects, total ", response.Contents.length)
    response.Contents.slice(1, 3).forEach(c => console.log(" \t ", c.Key))
    console.log(" \t ... ")

    // Upload data details
    const file_path = "./data/test_tiny.txt"
    let fileStream = fs.createReadStream(file_path)
    const stats = fs.statSync(fileStream.path)
    const file_size = stats.size
    const target_file_name = `test_${uniqid()}.txt`

    //request the presigned url
    const Bucket = process.env.AWS_CONTAINER_NAME;
    const Key = target_file_name;
    const Fields = {};
    const Conditions = [] // TODO Conditions: [["eq", "$Content-Type", type]], file size  ["content-length-range", 100, 10000000] // 100Byte - 10MB
    const Expires =  600 // Seconds before the presigned post expires. 3600 by default.

    // single part test
    const presignedPostData = await createPresignedPost(s3Client, { Bucket, Key, Conditions, Fields, Expires});

    console.log(" * Got url for upload: ", presignedPostData.url)
    console.log(presignedPostData.fields)

    // do the upload using the presigned url data
    const formData = new FormData();
    Object.keys(presignedPostData.fields).forEach(key => {
      formData.append(key, presignedPostData.fields[key]);
    })

    // Actual file has to be appended last.
    formData.append("file", fileStream, {
        knownLength: file_size,
      })

   const responseUpload = await fetch(presignedPostData.url, {
        method: "POST",
        //headers: requestData.headers,
        body: formData,
      })

      console.log(responseUpload)
      console.log(await responseUpload.text())
    }

testS3();