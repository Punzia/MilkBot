//global.AbortController = require("node-abort-controller").AbortController;


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
const youtube = new Youtube(youtubeAPI);
const options = { transports: ['websocket'], pingTimeout: 3000, pingInterval: 5000 };

//https://freemp3cloud.com/
//https://www.youtube.com/watch?v=Q0PyIlH2o7s
var playingNow = 0;
var playingNow2 = 0;
//
//var playingSong = false;
//Define the channel and dispatcher for music.
var channel;
var dispatcher;
var musicPlaying = false;

const queue = new Map();
//const serverQueue = queue.get(message.guild.id);
// Has to do with songs and such ->

var qArray = [];
var currentSong = 0;
//var queue = new Map();

var songId = 0;
let keyObj = {}
var looping = false;
let songNbr = 0;

var queueStop = false;

require('events').EventEmitter.defaultMaxListeners = 15;

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    //client.user.

    client.user.setActivity("Music in Workers Republic ", {
        type: "PLAYING"
    });
});
const player = createAudioPlayer();
//!Important
//var servers = {};
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'play') {
        //await interaction.reply('No help from me, sorry');
        //let args = commandName.content.substring(message.content.indexOf(" ") + 1, message.content.length);
        const music = interaction.options.get("query").value
        console.log(music);

        if (interaction.member.voice.channel) {
            try {
                channel = interaction.member.voice.channel;
                let url = await searchYouTubeAsync(music);
                //qArray.push(url);

                let songInfo = await ytdl.getInfo(url);
                const song = {
                    title: songInfo.videoDetails.title,
                    url: songInfo.videoDetails.video_url,
                    thumbnail: songInfo.videoDetails.thumbnails[2].url,
                };

                var addToQueue = new newSong(song.title, song.url, song.thumbnail);
                qArray.push(addToQueue);
                //console.log(qArray);
                //channel join was here before I moved it to playSong function!
                if (musicPlaying === false) {
                    var keys = Object.keys(qArray);
                    var last = keys[keys.length - 1];
                    console.log("key is:", Number(last))
                    playMusic(interaction, Number(last));
                }
                else {
                    //message.channel.send(`Added song ${song.title} to queue!`);
                    const addedSong = new MessageEmbed()
                        .setColor('#FE7FDE')
                        .setURL(`${song.url}`)
                        .setTitle(`Queued ${song.title}`)
                        .setDescription('Song is now added to queue, check `/loop`to check current list!')
                        .setThumbnail(`${song.thumbnail}`)
                        .setTimestamp()
                    //.setFooter(client.user.username, client.user.avatarURL);

                    await interaction.reply({ embeds: [addedSong] });
                    console.log(qArray);
                }
            }
            catch (e) {
                console.log(e);
                await interaction.reply({ files: ["./assets/img/error.gif"] });
            }
        } else {
            await interaction.reply('You need to join a voice channel first!');
        }



    } else if (commandName === 'skip') {
        //await interaction.reply('Enable the news stream now!');
        var lastItem = qArray[qArray.length - 1]
        var playlist = qArray[currentSong];

        console.log(playlist);
        console.log("Last item in queue:", lastItem);

        if (playlist != lastItem) {
            musicPlaying = false;
            console.log("Skipping the current song!")
            const skipSong = currentSong + 1;
            playMusic(interaction, skipSong);
            currentSong = skipSong;
            console.log(currentSong);
            await interaction.reply("Bla, Skipping current song!");
        }
        else {
            await interaction.reply("The lastest song is currently playing use `/loop` to make the playlist loop!")
        }
    }
    else if (commandName === 'queue') {
        await interaction.reply('Disabling the news stream now.');
    }
    else if (commandName === 'stop') {
        await interaction.reply("Fine you party pooper :C I didn't enjoy dancing either... Hmph Baka");
        player.stop();
    }
});

//https://github.com/discordjs/discord.js/blob/master/docs/topics/voice.md
//https://github.com/amishshah/ytdl-core-discord/issues/391
//https://github.com/amishshah/ytdl-core-discord/pull/392
//https://github.com/discordjs/voice/blob/main/examples/music-bot/src/bot.ts
//https://stackoverflow.com/questions/2672380/how-do-i-check-in-javascript-if-a-value-exists-at-a-certain-array-index

async function playMusic(interaction, song) {
    currentSong = song;
    console.log("The song id:", song);
    
    // Going back to this to remove the CurrentSong variable
    const currentIndex = qArray.indexOf(currentSong);
    const nextIndex = (currentIndex + 1) % qArray.length;
    console.log('\x1b[31m%s\x1b[0m', "Async func song: " + song);


    const currentSongUrl = qArray[song].url;

    console.log("The song url is: " + currentSongUrl);
    //const currentSongUrl2 = "https://www.youtube.com/watch?v=5wAMj34aTAI"

    var stream = await ytdl(currentSongUrl, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
    });

    const resource = createAudioResource(stream, {
        inputType: StreamType.Opus,
        inlineVolume: true
    });
    resource.volume.setVolume(0.2);

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    })
    connection.subscribe(player)



    //player.on(AudioPlayerStatus.Playing, () => {
    //console.log('The audio player has started playing!');


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

    player.play(resource);
    //await interaction.reply({ embeds: [songEmbed] });
    await interaction.reply("Playing music now!")

    player.on(AudioPlayerStatus.Playing, () => {
        musicPlaying = true;
        console.log("Currently playing!")
    });

    //await message.channel.send({ embeds: [songEmbed] });

    /*
    player.on('error', error => {
        console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
        player.play(getNextResource());
    });
    */

    //});

    player.on(AudioPlayerStatus.Idle, () => {
        musicPlaying = false;
        
        console.log("Stopped");
        var newSong = currentSong + 1;

        console.log("New song is this atm", newSong);
        
        let nowPlaying = qArray[currentSong];
        let lastItem = qArray[qArray.length - 1];
        console.log("This is the last item", lastItem)
        if (nowPlaying != lastItem) {
            // Go to the next resource!
            // instead of newSong use qArray.shift()
            nextResource(newSong);
            //console.log(_Next)
        }
        else {
            interaction.followUp('The last song has been played');
        }

        //console.log(currentSong);
        /*
        try {
 
 
            console.log("Lastitme id:", lastItem)
 
            console.log('\x1b[33m%s\x1b[0m', "Last item value:" + lastItem.url);
            if (nowPlaying == 1) {
                console.log("Huh?")
            }
            if (nowPlaying != lastItem) {
                console.log("Skipping the current song!")
 
                //console.log("Play with current song: " + newSong);
                console.log("New song value: ", newSong)
                //goNext(newSong)
                //playMusic("mp.setDataSource(audioArray[currentIndex + 1]);")
 
                // Make a function to get next resource
                //player.play(playMusic(interaction, newSong));
                
                //playMusic(interaction, newSong);
            }
            else if (nowPlaying == lastItem && looping === true) {
                //playMusic(message, 0);
            }
            else {
                console.log("The song is last and now it should stop..")
            }
        }
        catch (e) { console.log(e) }
        */
    });

    player.on('error', error => {
        console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
        //var newSong = song + 1;
        player.play(nextResource(newSong))
    });

}

async function nextResource(n_songdId) {
    currentSong = n_songdId;
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
    resource.volume.setVolume(0.2);
    player.play(resource)   
    musicPlaying = true;
}

// The array structure:
function newSong(title, url, thumbnail) {
    //this.id = id;
    this.title = title;
    this.url = url;
    this.thumbnail = thumbnail;
}
async function getQueue() {
    var queueArray = qArray.length;
    return queueArray;
}

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
