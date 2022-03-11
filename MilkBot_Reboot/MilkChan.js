const { Client, Intents, MessageEmbed, MessageActionRow, Permissions, VoiceChannel, Channel } = require('discord.js');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"] });
const { Opus } = require('@discordjs/opus');
const _sodium = require('libsodium-wrappers');
const wait = require('util').promisify(setTimeout);
const {
    voice,
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
//const emitter = new EventEmitter()
// or 0 to turn off the limit
//require('events').EventEmitter.prototype._maxListeners = 0;
process.setMaxListeners(0);

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
    /*
    client.user.setActivity("music🎶", {
        status: 'idle',
        type: "LISTENING"
    });

    const activities = [
        {
            type: "WATCHING",
            activity: "Loba's 🍑"
        },
        {
            type: "LISTENING",
            activity: "music 🎶"
        }

    ];

    const timeoutForNms = 3600000; // 10 seocnds
    let currentActivity = 0;
    setInterval(() => {
        console.log('set activity to %s type to %s', activities[currentActivity].activity, activities[currentActivity].type);
        client.user.setActivity(`${activities[currentActivity].activity}`, { type: `${activities[currentActivity].type}` });
        currentActivity++;
        if (currentActivity === activities.length) {
            currentActivity = 0;
        }
    }, timeoutForNms);
    */
});

const queue = new Map();
//const subscriptions = new Map<Snowflake, MusicSubscription>();
//console.log(queue)
/*
client.on('messageCreate', message => {
    if (message.author.bot) return;
    // Certain maps
    //const serverQueue = queue.get(message.guild.id);
    if (message.content.includes('https://join.btd6.com/Coop/')) {
        console.log();

        var string = message.content
        var matches = string.match(/\bhttps?:\/\/\S+/gi);
        var adr = matches[0];
        var q = url.parse(adr, true);
        var codepath = q.pathname

        //console.log(q.pathname); 
        var code = codepath.replace("/Coop/", "");
        console.log("This the code: " + code)
        message.channel.send(code);
    }
});
*/

//const player = createAudioPlayer();
//!Important
//var servers = {};
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const serverQueue = queue.get(interaction.guildId);
    const voiceChannel = interaction.member.voice.channel;
    //const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });
    //const channel = interaction.member.voice.channel;


    switch (commandName) {

        case "play":
            // Time to play music!
            playFunc(interaction, serverQueue)
            break;
        case "leave":
            //leaveQueue();
            console.log('Leave');


            if (!voiceChannel && serverQueue) {
                return await interaction.reply("Don't mess with the people vibing");
            }
            if (!serverQueue) {
                return await interaction.reply("There is no queue currently playing!");
            }
            getVoiceConnection(interaction.guildId).disconnect();
            queue.delete(interaction.guildId);
            await interaction.reply("Fine B-Baka!")



            break;
        case "queue":
            //await interaction.reply('queue');
            //console.log(serverQueue)
            if (!serverQueue) {
                await interaction.reply("Nah, you can't check that");

            }
            else {
                var songsArray = serverQueue.songs;
                var listpos = 0;
                //https://www.youtube.com/watch?v=GGQjxyrcMPA
                const list = new MessageEmbed()
                list.setAuthor({ name: '🥛', iconURL: 'https://i.imgur.com/QAUd9iD.png', url: 'https://punzia.com' })
                list.setDescription("This is the currently playing queue on this server!")
                list.setTitle('Current Music Queue in ' + `${interaction.guild.name}!`)
                list.setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
                list.setColor('#000000')
                for (let i = 0; i < songsArray.length; i++) {
                    listpos++;
                    if (serverQueue.currentSong == i && serverQueue.playing) {
                        list.addFields(

                            { name: `**${listpos}.) **` + "```(PLAYING RIGHT NOW!)```", value: `${songsArray[i].title}`, inline: true },
                            { name: 'Time', value: convertTime(songsArray[i].timelength), inline: true },
                            //{ name: '\u200B', value: '\u200B' },
                            { name: 'Link', value: `${songsArray[i].url}`, inline: true },
                        )
                    }
                    else {
                        //list.addField(`**${listpos}) **` + `${songsArray[i].title}`, `${songsArray[i].url}`, false)
                        list.addFields(
                            { name: `**${listpos}.) **`, value: `${songsArray[i].title}`, inline: true },
                            { name: 'Time', value: convertTime(songsArray[i].timelength), inline: true },
                            //{ name: '\u200B', value: '\u200B' },
                            { name: 'Link', value: `${songsArray[i].url}`, inline: true },
                        )
                    }


                }
                await interaction.reply({ embeds: [list] });
            }
            const test = queue.get(interaction.guildId);
            console.log(test)
            break;
        case "skip":
            //await interaction.reply('skip command!')
            //getNextResource(guild, serverQueue.songs[serverQueue.currentSong + 1])
            if (!serverQueue) {
                await interaction.reply("You can't skip something that is");
            }
            break;
        case "remove":
            const musicQueue = queue.get(interaction.guildId);
            const args = interaction.options.get('id').value;
            //console.log(args[0]);
            //var currentPlaying = serverQueue.currentSong;
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
                return await interaction.reply(":x: You're such a loser ready to cry!", { files: ["https://i.imgur.com/RrazIHR.gif"] })
            }
            if (args[0] > musicQueue.songs.length) {
                return await interaction.reply(":x: **The queue doesn't have that much songs**")
            }
            if (args[0] == musicQueue.currentSong + 1) {
                return await interaction.reply(":x: **I rather not remove the currently playing song... Better to skip it instead..**")
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
            serverQueue.playing = false;
            serverQueue.audioPlayer.stop()
            await interaction.reply('Stopping the queue!')
            break;
        case "loop":
            //const voiceChannel = interaction.member.voice.channel;

            if (!serverQueue) {
                await interaction.reply("There is no queue to loop!");
            }
            if (!voiceChannel) {
                return await interaction.reply("You aren't in the voice channel currently!");
            }
            if (serverQueue.loop) {
                serverQueue.loop = false;
                await interaction.reply("Disabling loop now!");
            }
            serverQueue.loop = true;
            await interaction.reply("Enabling loop!");

            break;
    }
});

async function skip(interaction, serverQueue) {
    console.log("-----------------------------------")
    console.log(serverQueue.songs);

    if (!interaction.member.voice.channel)
        await interaction.reply(
            "You have to be in a voice channel to stop the music!"
        );
    if (!serverQueue)
        await interaction.reply("There is no song that I could skip!");
    else {
        getNextResource(interaction.guild.id);
    }
    //serverQueue.connection.dispatcher.end();
}
async function playFunc(interaction, serverQueue) {
    const query = interaction.options.get("query").value;

    //let subscription = subscriptions.get(interaction.guildId);
    console.log("This is the queuery btw!", query)

    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
        return await interaction.reply("I'm sorry, but you must be in a voice channel!");
    }

    let url = await searchYouTubeAsync(query);
    let songInfo = await ytdl.getInfo(url);
    //console.log(songInfo)

    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
        thumbnail: songInfo.videoDetails.thumbnails[2].url,
        timelength: songInfo.videoDetails.lengthSeconds
    };

    if (!serverQueue) {

        console.log('Not defined yet!')
        //https://stackoverflow.com/questions/67353118/how-do-i-make-it-so-a-discord-music-bot-deletes-the-now-playing-message-after
        const queueContruct = {
            textChannel: interaction.channel,
            voiceChannel: voiceChannel,
            connection: null,
            audioPlayer: createAudioPlayer(),
            songs: [],
            volume: 5,
            loop: false,
            //Added here to check the current song
            currentSong: 0,
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
                .setAuthor({ name: '🥛', iconURL: 'https://i.imgur.com/QAUd9iD.png', url: 'https://punzia.com' })
                .setColor('#34C5E3')
                .setURL(`${song.url}`)
                .setTitle(`Playing ${song.title}`)
                .setDescription(`Currently playing the song in ${queueContruct.voiceChannel}`)
                .setThumbnail(`${song.thumbnail}`)
                .setTimestamp()
            // queueContruct.currentSong
            play(interaction.guild, queueContruct.songs[0]);
            await interaction.reply({ embeds: [songEmbed] });
            //await guild.interaction.reply('hi')
            //Before
            //play(interaction.guild, queueContruct.songs[0]);
        } catch (err) {
            console.log(err);
            return interaction.channel.send("I'm sorry some error occured")
        }

    }
    else {
        // Add the song to the queue!
        serverQueue.songs.push(song);
        if (!serverQueue.playing) {
            serverQueue.playing = true;
            //console.log(serverQueue)
            const nextItem = serverQueue.currentSong + 1;
            const nextSong = serverQueue.songs[serverQueue.currentSong + 1]
            const songEmbed = new MessageEmbed()
                .setAuthor({ name: '🥛', iconURL: 'https://i.imgur.com/QAUd9iD.png', url: 'https://punzia.com' })
                .setColor('#34C5E3')
                .setURL(`${nextSong.url}`)
                .setTitle(`Playing ${nextSong.title}`)
                .setDescription(`Currently playing the song in ${serverQueue.voiceChannel}`)
                .setThumbnail(`${nextSong.thumbnail}`)
                .setTimestamp()

            await interaction.reply({ embeds: [songEmbed] });

            serverQueue.currentSong = nextItem;
            play(interaction.guild, nextSong);
        }
        else {
            //console.log(serverQueue.songs);
            console.log("Adding to the queue!")
            const addedSong = new MessageEmbed()
                .setAuthor({ name: '🥛', iconURL: 'https://i.imgur.com/QAUd9iD.png', url: 'https://punzia.com' })
                .setColor('#D427FA')
                .setURL(`${song.url}`)
                .setTitle(`Queued ${song.title}`)
                .setDescription('Song is now added to queue, check `/queue`to check current list!')
                .setThumbnail(`${song.thumbnail}`)
                .setTimestamp()

            await interaction.reply({ embeds: [addedSong] });
        }
    }


}
// Play the next song!
async function play(guild, song) {

    const serverQueue = queue.get(guild.id);
    console.log("go and play music!")

    const player = serverQueue.audioPlayer;
    /*
    if (!song) {     
        // Check on shift currently! Change the code to push the first song last.      
        console.log("No song")
        serverQueue.playing = false;
        return player.stop();
    }*/


    //player.play(resource);
    serverQueue.connection.subscribe(player)
    var resource = await createResource(song)
    //console.log(resource1);
    serverQueue.playing = true;
    console.log("Player is playing")
    player.play(resource);


    player.on('error', error => {
        console.error(error);
    });


    player.on(AudioPlayerStatus.Idle, async () => {
        console.log("Ended");

        try {
            console.log("Idle");
            if (serverQueue.playing) {
                var nextSong = await getNextSong(guild, song)
                var resource = await createResource(nextSong);
                player.play(resource)

            }
            serverQueue.playing = false;
            player.stop();

        }
        catch (e) {
            console.log(e)
        }

    });
    //}
}

async function createResource(song) {
    console.log(song);
    //console.log("Playing this one!", song.url)   
    var stream = await ytdl(song.url, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
    });

    const resource = createAudioResource(stream, {
        inputType: StreamType.Opus,
        inlineVolume: true
    });
    resource.volume.setVolume(1);
    return resource;
}

// Maybe remove the async thing here if the thing doeesn't work!;
async function getNextSong(guild, song) {
    var serverQueue = queue.get(guild.id);
    var songQueue = serverQueue.songs;
    var index = songQueue.indexOf(song);

    try {
        if (index >= 0 && index < songQueue.length - 1) {
            var nextSong = songQueue[index + 1]
        }

        if (!nextSong) {

            if (serverQueue.loop) {
                console.log(serverQueue.loop);
                songQueue.push(songQueue[0])
                songQueue.shift();
                var resource = songQueue[0]
                //console.log(resource)
                return resource
            }
            console.log("Stop")
            
            //serverQueue.audioPlayer.stop();
            return serverQueue.playing = false
        }
        console.log("Next song!")
        return nextSong;
    }
    catch (e) {
        console.log(e)
    }


}

function convertTime(sec) {
    var hours = Math.floor(sec / 3600);
    (hours >= 1) ? sec = sec - (hours * 3600) : hours = '00';
    var min = Math.floor(sec / 60);
    (min >= 1) ? sec = sec - (min * 60) : min = '00';
    (sec < 1) ? sec = '00' : void 0;

    (min.toString().length == 1) ? min = '0' + min : void 0;
    (sec.toString().length == 1) ? sec = '0' + sec : void 0;

    return hours + ':' + min + ':' + sec;
}

// Search for the song on Youtube otherwise just take the url and add that one.
async function searchYouTubeAsync(args) {
    // Check a fix for making the bot do "didn't" as it seems to fking error it"
    // Added a temp fix for try catch block;
    try {
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
    catch (e) {
        console.log(e);
    }

}

client.login(token)
