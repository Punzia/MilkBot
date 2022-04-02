const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton, Permissions, VoiceChannel, Channel } = require('discord.js');
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
//const fs = require('fs');
const { OpusEncoder } = require('@discordjs/opus');
//process.setMaxListeners(0);
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
const youtube = new Youtube(youtubeAPI);
const cron = require("cron");
/*
Og MILKBOT
*/
//Define the channel and dispatcher for music.
//var channel;
const milkbotAvatar = "https://i.imgur.com/1zAmUVJ.png"



const queue = new Map();


client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);

    //client.user.

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
    //Change the status!
    let currentActivity = 0;
    var statusCron = new cron.CronJob('0 * * * *', function () {
        console.log('set activity to %s type to %s', activities[currentActivity].activity, activities[currentActivity].type);
        client.user.setActivity(`${activities[currentActivity].activity}`, { type: `${activities[currentActivity].type}` });
        currentActivity++;
        if (currentActivity === activities.length) {
            currentActivity = 0;
        }


    });
    statusCron.start();

});


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
        case "help":
            const helpEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle("🥛 Command List! ")
            .setAuthor({ name: '🥛', iconURL: milkbotAvatar, url: 'https://punzia.com/' })
            .setThumbnail(milkbotAvatar)
            .setDescription('Some helpful list of commands!')
            .addFields(
                { name: '``/help``', value: 'Shows this command!' },
                { name: '``/play **song**``', value: 'Play music!' },
                { name: '``/skip``', value: 'Skip to next song in queue' },
                { name: '``/loop``', value: 'Enable and disable loop!' },
                { name: '``/remove **id**``', value: 'Remove the song in queue at current value!' },
            )
            .setTimestamp()

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true  });
            break;

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
                list.setAuthor({ name: '🥛', iconURL: milkbotAvatar, url: 'https://punzia.com' })
                list.setDescription("This is the currently playing queue on this server!")
                list.setTitle('🎧 Current Music in ' + `${interaction.guild.name}! 🎶`)
                list.setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
                list.setColor('#000000')
                for (let i = 0; i < songsArray.length; i++) {
                    listpos++;
                    if (serverQueue.currentSong == i && serverQueue.playing) {
                        list.addFields(
                            { name: `**${listpos}.) **` + "```(PLAYING RIGHT NOW!)```", value: `${songsArray[i].title}`, inline: true },
                            { name: 'Link', value: `${songsArray[i].url}`, inline: true },
                            { name: 'Time', value: convertTime(songsArray[i].timelength), inline: true },
                        )
                    }
                    else {
                        list.addFields(
                            { name: `**${listpos}.) **`, value: `${songsArray[i].title}`, inline: true },
                            { name: 'Link', value: `${songsArray[i].url}`, inline: true },
                            { name: 'Time', value: convertTime(songsArray[i].timelength), inline: true },

                        )
                    }


                }
                await interaction.reply({ embeds: [list] });
            }
            //const test = serverQueue.songs;
            console.log(songsArray)
            break;
        case "skip":

            var loop = serverQueue.loop;
            var songQueue = serverQueue.songs;
            //await interaction.reply('skip command!')
            //getNextResource(guild, serverQueue.songs[serverQueue.currentSong + 1])
            if (!serverQueue) return await interaction.reply("You can't skip something that doesn't exist!");
            if (songQueue.length == 1) return await interaction.reply("You can't use skip when there is only one song in queue!");
            if (loop) {
                console.log("Loop skip!")

                songQueue.push(songQueue[0])
                songQueue.shift();

                //serverQueue.audioPlayer.stop();     
                play(interaction.guild);
                return await interaction.reply("Skipping song! `(Currently looping the queue!)`");
            }
            else {
                console.log("Skip songs!")
                serverQueue.songs.shift();
                play(interaction.guild);
                return await interaction.reply("Skipping song!");
            }
        //serverQueue.playing = false;
        case "remove":
            const musicQueue = queue.get(interaction.guildId);
            const args = interaction.options.get('id').value;
            //const songQueue = serverQueue.songs;

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
                //const collector = message.createMessageComponentCollector({ componentType: 'BUTTON', time: 15000 });
                const filter = i => i.customId === 'Yes' || i.customId === 'No';

                const collector = interaction.channel.createMessageComponentCollector({ filter, max: 1, time: 10000 });
                

                collector.on('collect', async i => {
                    if (i.customId === 'Yes') {
                        
                        //var rIndex = musicQueue.songs[args[0] - 1];
                        console.log(args[0] - 1)
                        //console.log(remove.title)
                        //var name = queue.queue[args[0] - 1].name;
                        
                        await i.reply(`Removing song " ${musicQueue.songs[args[0] - 1].title}" now!`)
                        musicQueue.songs.splice(args[0] - 1, 1);  
                            
                        
                        
                    }
                    else {
                      return await i.reply("Not removing song now!")
                    }
                });


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
            serverQueue.loop = false;
            serverQueue.audioPlayer.stop()
            return await interaction.reply('Stopping the queue!')
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
                return await interaction.reply("Disabling loop now!");
            }
            serverQueue.loop = true;
            await interaction.reply("Enabling loop!");

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
    try {
        let url = await searchYouTubeAsync(query);
        let songInfo = await ytdl.getInfo(url);
    }
    catch {
        return await interaction.reply("I'm sorry but the API key used for the bot won't allow us to play music :C")
    }

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
            await interaction.reply("Starting music! UwU Milkies!")
            play(interaction.guild);
        } catch (err) {
            console.log(err);
            return interaction.channel.send("I'm sorry some error occured")
        }

    }
    else {
        // Add the song to the queue!
        //serverQueue.songs.push(song);

        //if (serverQueue.playing == false) {
        if (serverQueue.songs.length < 1) {
            serverQueue.songs.push(song);
            console.log(song);
            const songEmbed = new MessageEmbed()
                .setAuthor({ name: '🥛', iconURL: milkbotAvatar, url: 'https://punzia.com' })
                .setColor('#34C5E3')
                .setURL(`${song.url}`)
                .setTitle(`Playing ${song.title}`)
                .setDescription(`Currently playing the song in ${serverQueue.voiceChannel}`)
                .setThumbnail(`${song.thumbnail}`)
                .setTimestamp()

            await interaction.reply({ embeds: [songEmbed] });
            // It was next song lmaooo!
            serverQueue.playing = true;
            serverQueue.currentSong = serverQueue.songs.indexOf(song);
            play(interaction.guild);
        }
        else {
            //console.log(serverQueue.songs);
            // Push the song to queue if it's playing!
            serverQueue.songs.push(song);

            console.log("Adding to the queue!")
            const addedSong = new MessageEmbed()
                .setAuthor({ name: '🥛', iconURL: milkbotAvatar, url: 'https://punzia.com' })
                .setColor('#D427FA')
                .setURL(`${song.url}`)
                .setTitle(`⏭️ Queued ${song.title}`)
                .setDescription('Song is now added to queue, check `/queue`to check current list!')
                .setThumbnail(`${song.thumbnail}`)
                .setTimestamp()

            await interaction.reply({ embeds: [addedSong] });
        }
    }


}
// Play the next song!
//const play = async (guild) => {
async function play(guild) {

    const serverQueue = queue.get(guild.id);
    console.log("go and play music!")
    //const player = serverQueue.audioPlayer;
    const player = createAudioPlayer();

    //var song = serverQueue.songs[0]
    var resource = await createResource(serverQueue.songs[0]);

    const subscription = serverQueue.connection.subscribe(player)
    
    if (subscription) {
        setTimeout(() => subscription.unsubscribe(), 5_000);
    }
    

    //serverQueue.playing = true;
    player.play(resource);


    player.on(AudioPlayerStatus.Playing, async () => {
        console.log("Playing!")
        //const time = track.duration * 1000
        
        var _songp = serverQueue.songs[0];
        console.log(_songp.timelength * 1000)
        const songEmbed = new MessageEmbed()
            .setAuthor({ name: '🥛', iconURL: milkbotAvatar, url: 'https://punzia.com' })
            .setColor('#34C5E3')
            .setURL(`${_songp.url}`)
            .setTitle(`▶️ Now playing ${_songp.title}`)
            .setDescription(`Currently playing the song in ${serverQueue.voiceChannel}`)
            .setThumbnail(`${_songp.thumbnail}`)
            .setTimestamp()
        /*
        const time = track.duration * 1000
        message.channel.send('your-message').then(m => setTimeout({
        m.delete }, time))
 
        */

        //await serverQueue.textChannel.send(`Playing \`${serverQueue.songs[0].title}\``)
        await serverQueue.textChannel.send({ embeds: [songEmbed] })
        /*
        .then(m => setTimeout({
            m.delete }, time))
            */
    });

    player.on(AudioPlayerStatus.Idle, async () => {
        //player.stop()
        var song = serverQueue.songs[0];
        var songQueue = serverQueue.songs;

        console.log("Ended");
        if (serverQueue.loop) {
            if (songQueue.length == 1) {
                console.log("Only one song!")
                return play(guild)
            } else {
                console.log("There are more songs to loop!")
                songQueue.push(songQueue[0])
                songQueue.shift();
                return play(guild)
            }
            //var getNextSong = await createResource(song);
            //return await player.play(getNextSong)        
        }
        // It was else       
        else {
            console.log("Remove!")
            serverQueue.songs.shift();
            song = songQueue[0];
            console.log(song)

            if (!song) {
                serverQueue.connection.disconnect();
                queue.delete(guild.id);
            }
            else {
                console.log("Play next song!");
                play(guild)
            }
        }


    });
}

async function createResource(song) {
    //console.log("Playing: " + song.title);
    //console.log("Playing this one!", song.url)   
    try {
        if (!song) {
            console.log("Some error I think :/")
            return;
        }

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
    catch (err) {
        console.log(err)
    }
}

function getNextResource(guild) {
    var serverQueue = queue.get(guild.id);
    var songQueue = serverQueue.songs;
    var loop = serverQueue.loop;

    if (loop) {
        console.log("Loop")
        if (songQueue.length == 1) {
            return songQueue[0]
        } else {
            songQueue.push(songQueue[0])
            songQueue.shift();
            return songQueue[0];
        }

    }
    else {
        songQueue.shift();
        return songQueue[0];
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
        console.log("Api")
        console.log(e);
        return
    }

}

client.login(token)
