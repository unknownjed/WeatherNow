fetch('http://localhost:3000/api/link-preview?url=' + encodeURIComponent('https://news.google.com/rss/articles/CBMibkFVX3lxTE5DUzhJREdXcE9mV0hMU1g1bXgtOUtEYWhfNE9ONUJfZlBTV0FnaVl5cEtsTVJUQ2NEcEtRMC11d2kycExVUWFJNUptMXRiYTBLdFVsaUdOVmlMYXBXT2FtLXdtSHVBWi1CcW9nTWN3?oc=5'))
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
