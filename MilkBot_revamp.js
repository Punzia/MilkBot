const { Client, Intents, MessageEmbed, Permissions, VoiceChannel } = require('discord.js');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"] });
const { Opus } = require('@discordjs/opus');
const _sodium = require('libsodium-wrappers');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    StreamType,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    NoSubscriberBehavior
} = require('@discordjs/voice');
const { youtubeAPI, token } = require('./config.json');
const ffmpeg = require("ffmpeg-static")
const avconv = require("avconv")
const fs = require('fs');
const { OpusEncoder } = require('@discordjs/opus');


const ytdl = require('ytdl-core-discord');
//const ytdl = require('play-dl');
const { video_basic_info, stream } = require('play-dl');
const { url } = require('inspector');
const Youtube = require('simple-youtube-api');
//const { youtubeAPI } = require('./youtube-config.json');
const { validateID } = require('ytdl-core');
const { inflateRaw } = require('zlib');
const { once } = require('events');
const { executionAsyncResource } = require('async_hooks');
const youtube = new Youtube(youtubeAPI);
//const options = { transports: ['websocket'], pingTimeout: 3000, pingInterval: 5000 };



//Define the channel and dispatcher for music.
var channel;


//const serverQueue = queue.get(message.guild.id);
// Has to do with songs and such ->

var qArray = [];

//var queue = new Map();

const player = createAudioPlayer();
let keyObj = {}


//https://top.gg/bot/805547973790138440
//https://github.com/ZerioDev/Music-bot/blob/master/commands/music/search.js



client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    //client.user.

    client.user.setActivity("Music in Workers Republic ", {
        type: "PLAYING"
    });
});

const queue = new Map();
//!Important
//var servers = {};
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const serverQueue = queue.get(interaction.guildId);


    switch (commandName) {
        case "play":
            // Get the query that the user types!
            //playQueue(interaction, serverQueue)

            console.log(interaction.guildId)
            console.log(serverQueue)
            await interaction.reply("hii!");
            playFunc(interaction, serverQueue)

            break;
        case "queue":
            await interaction.reply('queue');
            //console.log(guild.id)
            //console.log(interaction.guildId)
            break;
    }
});

async function playFunc(interaction, serverQueue) {
    const query = interaction.options.get("query").value;
    console.log("This is the queuery btw!", query)

    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
        return await interaction.reply("I'm sorry, but you must be in a voice channel!");
    }
    let url = await searchYouTubeAsync(query);
    //qArray.push(url);

    let songInfo = await ytdl.getInfo(url);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
        //thumbnail: songInfo.videoDetails.thumbnails[2].url,
    };

    
    if (!serverQueue) {
        console.log('not defined yet!')

        const queueContruct = {
            textChannel: interaction.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };
        queue.set(interaction.guildid, queueContruct);
        queueContruct.songs.push(song);
        try {
            console.log("connect to channel!")
            /*
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(interaction.guild, queueContruct.songs[0]);
            */
        } catch (err) {
            console.log(err);
            //queue.delete(message.guild.id);
            //return message.channel.send(err);
        }



    } else {
        //serverQueue.songs.push(song);
        //console.log(serverQueue.songs);
        //return interaction.reply(`${song.title} has been added to the queue!`);
        console.log("Adding to the queue!")
    }
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }
    /*
    const dispatcher = serverQueue.connection
      .play(ytdl(song.url))
      .on("finish", () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
      })
      .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Start playing: **${song.title}**`);
    */
  }



async function playMusic(interaction, song) {


    var stream = await ytdl(currentSongUrl, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
    });

    const resource = createAudioResource(stream, {
        inputType: StreamType.Opus,
        inlineVolume: true
    });
    resource.volume.setVolume(0.5);

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    })
    connection.subscribe(player)

    const streamInfo = {
        title: qArray[song].title,
        url: qArray[song].url,
        thumbnail: qArray[song].thumbnail,
    };

    const songEmbed = new MessageEmbed()
        .setColor('#eaf44d')
        .setURL(`${streamInfo.url}`)
        .setTitle(`Playing ${streamInfo.title}`)
        .setDescription(`Currently playing the song in ${interaction.member.voice.channel}`)
        .setThumbnail(`${streamInfo.thumbnail}`)
        .setTimestamp()

    await interaction.reply({ embeds: [songEmbed] });
    player.play(resource);

    player.on(AudioPlayerStatus.Playing, () => {
        console.log('\x1b[31m%s\x1b[0m', currentSong)
        console.log("Currently playing!")
    });

    player.on(AudioPlayerStatus.Idle, () => {

        console.log("Stopped");

    });

    player.on('error', error => {
        console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
        //var newSong = song + 1;
        player.play(nextResource(newSong))
    });

}

async function nextResource(n_songdId) {

    //Check if the last id is here either playe the next song musicPlaying = false;
    //var n_songdId = currentSong + 1;
    var nextSongUrl = qArray[n_songdId].url;

    var stream = await ytdl(nextSongUrl, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
    });
    const resource = createAudioResource(stream, {
        inputType: StreamType.Opus,
        inlineVolume: true
    });
    resource.volume.setVolume(0.5);
    player.play(resource)
    currentSong = n_songdId;
    musicPlaying = true;
}

// The array structure:
function newSong(title, url, thumbnail) {
    //this.id = id;
    this.title = title;
    this.url = url;
    this.thumbnail = thumbnail;
}
/*
async function getQueue() {
    var queueArray = qArray.length;
    return queueArray;
}
*/
// Search for the song on Youtube otherwise just take the url and add that one.
async function searchYouTubeAsync(args) {
    //console.log("Loading async function!");
    var video = await youtube.searchVideos(args.toString().replace(/,/g, ' '));
    var vidURL = "";
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
    var match = args.match(regExp);
    //if (args.includes("youtube.com")) {
    if (match) {
        vidURL = args;
    }
    else {
        vidURL = "https://www.youtube.com/watch?v=" + video[0].raw.id.videoId;
    }
    return vidURL;
}

client.login(token)
