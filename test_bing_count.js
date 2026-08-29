fetch("https://www.bing.com/news/search?q=Seattle+weather&format=rss").then(r => r.text()).then(t => console.log("Default items:", t.match(/<item>/g).length));
