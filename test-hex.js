const url = 'https://news.google.com/rss/articles/CBMiXEFVX3lxTE5oV19Xa084b0JEMnJtUXZUZkxwSjhPUWNmZjZBYnVxZkhYRjVrdHNsTFB2dnNSQnJfVmVCaE9KcmxCOE56QjRzRFhOMG5fV1R3VlN1b2ZmcGtZbks2?oc=5';
const base64str = url.split('articles/')[1].split('?')[0];
const buff = Buffer.from(base64str, 'base64url');
console.log(buff.toString('hex'));
