const original = "http://www.bing.com/th?id=ONUT.bX3Qa4VysGfOaCPoTgXAzw&pid=News";
const replaced = original.replace("&pid=News", "") + "&w=800&h=450&c=14";
console.log(replaced);
