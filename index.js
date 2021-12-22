
const { S3Client, ListObjectsCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } = require("@aws-sdk/client-s3")
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
    const file_path = "./data/test_2mb.txt"
    let fileBuffer = fs.readFileSync(file_path)
    const target_file_name = `test_${uniqid()}.txt`

    // initiate the multipart
    const command = new CreateMultipartUploadCommand({Bucket: process.env.AWS_CONTAINER_NAME, Key: target_file_name})
    const responseCreateMultipart = await s3Client.send(command)
    const UploadID = responseCreateMultipart.UploadId
    console.log("uploadID = ", UploadID)

    //request the presigned url
    const Bucket = process.env.AWS_CONTAINER_NAME;
    const Key = target_file_name;
    const Fields = {};
    const Conditions = [] // TODO Conditions: [["eq", "$Content-Type", type]], file size  ["content-length-range", 100, 10000000] // 100Byte - 10MB
    const Expires =  600 // Seconds before the presigned post expires. 3600 by default.
    //const ContentLength = Buffer.byteLength(fileBuffer)

    // single part test
    const PartNumber = 1
    const uploadPartCommand = new UploadPartCommand({ Bucket, Key, Conditions, Fields, Expires, UploadID, PartNumber});
    const presignedPostURL = await getSignedUrl(s3Client, uploadPartCommand, { expiresIn: 3600 });
    
    console.log(" * Got: ", presignedPostURL)
 
   const responseUpload = await fetch(presignedPostURL, {
        method: "PUT",
        //headers: requestData.headers,
        body: fileBuffer,
      })

    console.log("PUT response:", responseUpload)

    //let completeUploadCommand = new CompleteMultipartUploadCommand()
    //CompleteMultipartUploadRequest
}

testS3();