fetch('https://news.google.com/rss/articles/CBMif0FVX3lxTE1WdXlTX1U5V3ZzbWYwZnpXMm1SUDVIY3VMR043SFBvUjhzY1FEZ3pnUEJDTkQxVzY4NEY0UWFHYngzVjBDNkNfWkJjNEtlUUxpV21SeHFrY1Fkcm9pWnoyV3ZRSHduMlRzSGM4WGg0eHpGSDFZOW5xNnFDLTU2bVE?oc=5')
.then(res => res.text())
.then(html => console.log(html.substring(0, 1000)));
