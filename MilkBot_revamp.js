const { Client, Intents, MessageEmbed, MessageActionRow, Permissions, VoiceChannel, Channel } = require('discord.js');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"] });
const { Opus } = require('@discordjs/opus');
const _sodium = require('libsodium-wrappers');
const wait = require('util').promisify(setTimeout);
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    StreamType,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    NoSubscriberBehavior,
    getVoiceConnection
} = require('@discordjs/voice');
const { youtubeAPI, token } = require('./config.json');
const ffmpeg = require("ffmpeg-static")
const avconv = require("avconv")
const fs = require('fs');
const { OpusEncoder } = require('@discordjs/opus');


const ytdl = require('ytdl-core-discord');
//const ytdl = require('play-dl');
//const { video_basic_info, stream } = require('play-dl');
const { url } = require('inspector');
const Youtube = require('simple-youtube-api');
//const { youtubeAPI } = require('./youtube-config.json');
const { validateID } = require('ytdl-core');
const { inflateRaw } = require('zlib');
const { once } = require('events');
const { executionAsyncResource } = require('async_hooks');
const { MessageButton } = require('discord.js');
const youtube = new Youtube(youtubeAPI);
//const options = { transports: ['websocket'], pingTimeout: 3000, pingInterval: 5000 };



//Define the channel and dispatcher for music.
var channel;


//const serverQueue = queue.get(message.guild.id);
// Has to do with songs and such ->

var qArray = [];

//var queue = new Map();

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    //client.user.

    client.user.setActivity("music🎶", {
        status: 'idle',
        type: "LISTENING"
    });
});

const queue = new Map();
//const subscriptions = new Map<Snowflake, MusicSubscription>();
console.log(queue)

//const player = createAudioPlayer();
//!Important
//var servers = {};
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const serverQueue = queue.get(interaction.guildId);
    //const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });
    //const channel = interaction.member.voice.channel;


    switch (commandName) {
        case "play":
            // Time to play music!
            playFunc(interaction, serverQueue)
            break;
        case "queue":

            await interaction.reply('queue');
            //console.log(serverQueue)
            const test = queue.get(interaction.guildId);
            console.log(test)
            break;
        case "skip":
            await interaction.reply('skip command!')
            break;
        case "remove":
            const musicQueue = queue.get(interaction.guildId);
            const args = interaction.options.get('id').value;

            //console.log(musicQueue.songs.length)
            if (!musicQueue) {
                return await interaction.reply('B-but there are no songs!')
            }

            if (!args[0]) {
                return await interaction.reply('No song number provided')
            }
            //console.log(serverQueue.songs[0])
            if (isNaN(args[0])) {
                return await interaction.reply('The ID must be a number!')
            }
            if (args[0] <= 0) {
                //const imagecook = new MessageAttachment('./assets/jinx-arcane.gif');
                return await interaction.reply(":x: You're such a loser ready to cry!" , {files: ["https://i.imgur.com/RrazIHR.gif"] })
            }
            if (args[0] > musicQueue.songs.length) {
                return await interaction.reply(":x: **The queue doesn't have that much songs**")
            }
            else {
                const row = new MessageActionRow()
                row.addComponents(
                    new MessageButton()
                        .setCustomId('Yes')
                        .setLabel('✔️')
                        .setStyle('SECONDARY'),
                );
                row.addComponents(
                    new MessageButton()
                        .setCustomId('No')
                        .setLabel('✖️')
                        .setStyle('SECONDARY')
                );

                var _title = musicQueue.songs[args[0] - 1].title;
                await interaction.reply({ content: `Want to me to remove ${_title}?`, components: [row] })
                /*
                collector.on('collect', async i => {
                    if (i.customId === 'primary') {
                        await i.deferUpdate();
                        await wait(4000);
                        await i.editReply({ content: 'A button was clicked!', components: [] });
                    }
                });
                */

                //collector.on('end', collected => console.log(`Collected ${collected.size} items`));
            }
            //var what = musicQueue.songs[args - 1].title;
            //console.log(what)
            console.log(_title)
            //await interaction.reply(names);
            //queueContruct.songs.splice(args[0] - 1);
            break;
        case "stop":
            await interaction.reply('Stopping the queue!')
            serverQueue.audioPlayer.stop()
            break;
    }
});

async function playFunc(interaction, serverQueue) {
    const query = interaction.options.get("query").value;
    //let subscription = subscriptions.get(interaction.guildId);
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
        thumbnail: songInfo.videoDetails.thumbnails[2].url,
    };

    if (!serverQueue) {
        console.log('Not defined yet!')

        const queueContruct = {
            textChannel: interaction.channel,
            voiceChannel: voiceChannel,
            connection: null,
            audioPlayer: createAudioPlayer(),
            songs: [],
            volume: 5,
            playing: true
        };

        queue.set(interaction.guildId, queueContruct);
        queueContruct.songs.push(song);

        try {
            console.log("connect to channel!")
            const channel = interaction.member.voice.channel;
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            })
            queueContruct.connection = connection;
            const songEmbed = new MessageEmbed()
                .setColor('#4B0082')
                .setURL(`${song.url}`)
                .setTitle(`Playing ${song.title}`)
                .setDescription(`Currently playing the song in ${queueContruct.voiceChannel}`)
                .setThumbnail(`${song.thumbnail}`)
                .setTimestamp()



            //await guild.interaction.reply('hi')
            play(interaction.guild, queueContruct.songs[0]);
            await interaction.reply({ embeds: [songEmbed] });


        } catch (err) {
            console.log(err);
            //queue.delete(message.guild.id);
            //return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        //console.log(serverQueue.songs);
        console.log("Adding to the queue!")
        const addedSong = new MessageEmbed()
            .setColor('#FE7FDE')
            .setURL(`${song.url}`)
            .setTitle(`Queued ${song.title}`)
            .setDescription('Song is now added to queue, check `/loop`to check current list!')
            .setThumbnail(`${song.thumbnail}`)
            .setTimestamp()

        await interaction.reply({ embeds: [addedSong] });

    }
}

async function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
        console.log("no song");
        //serverQueue.voiceChannel.leave();
        queue.delete(guild.id);

        return;
    }
    console.log("go and play music!")
    //console.log(serverQueue)
    var stream = await ytdl(song.url, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
    });

    const resource = createAudioResource(stream, {
        inputType: StreamType.Opus,
        inlineVolume: true
    });
    resource.volume.setVolume(0.5);

    const player = serverQueue.audioPlayer;
    serverQueue.connection.subscribe(player)

    player.play(resource);

    player.on(AudioPlayerStatus.Idle, () => {
        try {
            /* 
            Shift() removes the first song but if it tries to play the next song it just removes the first song
            but it plays the next song




            */

            serverQueue.songs.shift();
            console.log("Stopped");
            play(guild, serverQueue.songs[0]);
            console.log(serverQueue.songs[0])
            //serverQueue.textChannel.followup(`Now currently playing: **${song.title}**`)
            /*
            const songEmbed = new MessageEmbed()
                .setColor('#eaf44d')
                .setURL(`${song.url}`)
                .setTitle(`Playing ${song.title}`)
                .setDescription(`Currently playing the song!`)
                .setThumbnail(`${song.thumbnail}`)
                .setTimestamp()
            serverQueue.textChannel.send({ embeds: [songEmbed] });
            */

        }
        catch (e) {
            console.log(e)
        }
    });
}

// Search for the song on Youtube otherwise just take the url and add that one.
async function searchYouTubeAsync(args) {

    var video = await youtube.searchVideos(args.toString().replace(/,/g, ' '));
    var vidURL;
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
    var match = args.match(regExp);
    if (match) {
        vidURL = args;
    }
    else {
        vidURL = "https://www.youtube.com/watch?v=" + video[0].raw.id.videoId;
    }
    return vidURL;
}

client.login(token)
