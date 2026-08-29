const url = 'https://news.google.com/rss/articles/CBMiXEFVX3lxTE5oV19Xa084b0JEMnJtUXZUZkxwSjhPUWNmZjZBYnVxZkhYRjVrdHNsTFB2dnNSQnJfVmVCaE9KcmxCOE56QjRzRFhOMG5fV1R3VlN1b2ZmcGtZbks2?oc=5';
const base64str = url.split('articles/')[1].split('?')[0];

// Safe base64 decode
const buff = Buffer.from(base64str, 'base64url');
const str = buff.toString('utf-8');
const asciiStr = buff.toString('ascii');
console.log("Decoded utf8:", str.replace(/[^a-zA-Z0-9-.:/]/g, ' '));
console.log("Decoded ascii:", asciiStr.replace(/[^a-zA-Z0-9-.:/]/g, ' '));
