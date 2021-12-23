
const { S3Client, ListObjectsCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand} = require("@aws-sdk/client-s3")
const { getSignedUrl } = require( "@aws-sdk/s3-request-presigner")
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
    let fileBuffer = fs.readFileSync(file_path)
    const target_file_name = `test_${uniqid()}.txt`
    const Bucket = process.env.AWS_CONTAINER_NAME;
    const Key = target_file_name;

    // initiate the multipart
    const command = new CreateMultipartUploadCommand({Bucket, Key})
    const responseCreateMultipart = await s3Client.send(command)
    const UploadID = responseCreateMultipart.UploadId
    console.log("uploadID = ", UploadID)

    //request the presigned url
    const Fields = {};
    const Conditions = [] // TODO Conditions: [["eq", "$Content-Type", type]], file size  ["content-length-range", 100, 10000000] // 100Byte - 10MB
    const Expires =  600 // Seconds before the presigned post expires. 3600 by default.
    const ContentLength = Buffer.byteLength(fileBuffer)

    // single part test
    const PartNumber = 1
    const uploadPartCommand = new UploadPartCommand({ Bucket, Key, Conditions, Fields, Expires, UploadID, PartNumber});
    const presignedPostURL = await getSignedUrl(s3Client, uploadPartCommand, { expiresIn: 3600 });
    
    console.log(" * Got: ", presignedPostURL)
    console.log(" * Buffer: ", fileBuffer)
 
    // const myHeaders = new fetch.Headers();
    // myHeaders.append('Content-Type', 'text/plain');
    // myHeaders.append('Content-Length', ContentLength.toString());

   const responseUpload = await fetch(presignedPostURL, {
        method: "PUT",
        headers: {'Content-Type': 'application/octet-stream', 'Content-Length': ContentLength.toString(), 'content-length': ContentLength.toString()},
        body: fileBuffer
        //body: { "file": fileBuffer}
      })

      console.log("PUT response:", responseUpload)
      console.log("PUT response headers:", responseUpload.headers)

    let etag = responseUpload.headers.get('etag')
    console.log("PUT response Etag:", etag)

    let parts = [{
      ETag: etag,
      PartNumber: 1
    }]

    let completeUploadCommand = new CompleteMultipartUploadCommand({Bucket, Key, MultipartUpload: { Parts: parts }, UploadID})
    console.log(completeUploadCommand)
    const completeUploadResponse = await s3Client.send(completeUploadCommand)
    console.log(" * Got: ", completeUploadResponse)
}

testS3();