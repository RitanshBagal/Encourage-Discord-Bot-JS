import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import Database from "@replit/database";
const db = new Database();
import { keepAlive } from "./server.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const sadWords = [
  "sad",
  "depressed",
  "unhappy",
  "angry",
  "disheartened",
  "miserable",
  "depressing",
];
const starterEncouragements = [
  "Cheer up!",
  "Hang in there.",
  "You are a great person / bot",
];

async function checkEncouragements() {
  let encouragements = await db.get("encouragements");

  if (!encouragements || encouragements.length < 1) {
    await db.set("encouragements", starterEncouragements);
  }
}

// Call the function
checkEncouragements();

async function checkResponding() {
  let value = await db.get("responding");

  if (value == null) {
    await db.set("responding", true);
  }
}

// Call the function
checkResponding();

async function updateEncouragements(encouragingMessage) {
  let encouragements = await db.get("encouragements");
  encouragements.push(encouragingMessage);
  await db.set("encouragements", encouragements);
}

async function deleteEncouragement(index) {
  let encouragements = await db.get("encouragements");

  if (encouragements && encouragements.length > index) {
    encouragements.splice(index, 1);
    await db.set("encouragements", encouragements);
  }
}

async function getQuote() {
  const res = await fetch("https://zenquotes.io/api/random");
  const data = await res.json();
  return data[0]["q"] + " -" + data[0]["a"];
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot || !msg.content) {
    return;
  }

  try {
    if (msg.content === "$inspire") {
      const quote = await getQuote();
      if (quote && quote.trim()) {
        msg.channel.send(quote);
      } else {
        console.error("Empty or whitespace-only quote received.");
      }
    }

    const responding = await db.get("responding");
    if (responding && sadWords.some((word) => msg.content.includes(word))) {
      const encouragements = await db.get("encouragements");
      if (encouragements && encouragements.length > 0) {
        const validEncouragements = encouragements.filter(
          (encouragement) =>
            typeof encouragement === "string" && encouragement.trim(),
        );
        if (validEncouragements.length > 0) {
          const encouragement =
            validEncouragements[
              Math.floor(Math.random() * validEncouragements.length)
            ];
          msg.reply(encouragement);
        } else {
          console.error("No valid encouragements available.");
        }
      } else {
        console.error("No encouragements available.");
      }
    }

    if (msg.content.startsWith("$new")) {
      let encouragingMessage = msg.content.split("$new ")[1];
      if (encouragingMessage && encouragingMessage.trim()) {
        await updateEncouragements(encouragingMessage);
        msg.channel.send("New encouraging message added.");
      } else {
        console.error("Empty or whitespace-only encouraging message.");
      }
    }

    if (msg.content.startsWith("$del")) {
      let index = parseInt(msg.content.split("$del ")[1]);
      if (!isNaN(index)) {
        await deleteEncouragement(index);
        msg.channel.send("Encouraging message deleted.");
      } else {
        console.error("Invalid index for deletion.");
      }
    }

    if (msg.content.startsWith("$list")) {
      const encouragements = await db.get("encouragements");
      if (encouragements && encouragements.length > 0) {
        const encouragementList = encouragements.join("\n");
        msg.channel.send(encouragementList);
      } else {
        console.error("No encouragements available.");
      }
    }

    if (msg.content.startsWith("$responding")) {
      let value = msg.content.split("$responding ")[1];
      if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
        await db.set("responding", value.toLowerCase() === "true");
        msg.channel.send(
          `Responding is ${value.toLowerCase() === "true" ? "on" : "off"}.`,
        );
      } else {
        console.error("Invalid value for responding setting.");
      }
    }
  } catch (error) {
    console.error("Error handling message:", error);
  }
});

keepAlive();

const mySecret = process.env["TOKEN"];
client.login(mySecret);
