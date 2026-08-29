fetch("https://flipboard.com/topic/seattle.rss").then(r => r.text()).then(t => console.log("Flipboard items:", t.match(/<item>/g).length));
