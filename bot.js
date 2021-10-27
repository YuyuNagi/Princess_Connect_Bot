import discord from 'discord.js'
import fs from 'fs'
import 'dotenv/config.js'
console.log(process.env)

const client = new discord.Client()
const space = /\s+/g //find all space in the message. ※'/ /g' means "find"  & '\s' means "space" & + means "all"
const dot = /,/g
const list = readJSON('cycle.json')
const commandList = ['boss', 'noboss', 'check', 'reboss', 'create']

client.login(process.env.YOUR_TOKEN) 

client.on('ready', () => {
    console.log('Bot is raedy!')
})

client.on('message', message => {
    
    
    if(message.author == client.user || (message.content.substr(0,1)!=='!')){
        return
    }

    let [command, cycle, boss, damage, ...note] = message.content.substr(1).split(space)
    // delete the "!" tag
    // substr(<int>): keep the message after <int> bit.
    // split(<str>): split a string into a <str>, and return a new array

    if(!(commandList.some(tag => command === tag ))){
        return
    }
    try {
        if (cycle >= 1 && !isNaN(Number(cycle))){
            let guild = client.guilds.cache.get(process.env.SERVER_ID)
            let member = guild.member(message.author)
            let userNickname = member.displayName.toString()
            let realCycle = cycle - 1

            let roleCheck = member._roles.some((roleList) => {
                return roleList === '772370755475865632'
            })
            if (!roleCheck){
                return
            }

            switch (command){
                //!boss tag
                case 'boss':
                    if(checkMessage(realCycle, boss, message.channel, damage)){
                        let totalDamage = list[realCycle][boss-1].reduce((total, list) => {
                            return total + list.damage
                        }, 0)
                        if (Number(damage) <= 0){
                            message.channel.send('傷害必須為正')
                            break
                        } else if (list[realCycle][5][boss-1] - (totalDamage + Number(damage)) < 0){
                            message.channel.send('傷害過高 請與其他成員合刀')
                            break
                        } else {
                            bossCommand(realCycle, boss, userNickname, damage, note)
                            saveJSON('cycle.json', list)
                            client.channels.cache.get(process.env.BOT_CHANNEL).send(message.author.toString() + `報了第${realCycle+1}周第${boss}王`)
                        }
                    }
                    break

                //!noboss tag
                case 'noboss':
                    if(checkMessage(realCycle, boss, message.channel, damage)){
                        let found = list[realCycle][boss-1].filter(() => {
                            return userNickname
                        }).some((list) => {
                            return list.damage === Number(damage)
                        })
                        if(found){
                            let targetName = userNickname
                            nobossCommand(realCycle, boss, targetName, damage)
                            saveJSON('cycle.json', list)
                            client.channels.cache.get(process.env.BOT_CHANNEL).send(message.author.toString() + `取消了第${realCycle+1}周第${boss}王`)
                        } else {
                            message.channel.send('該週王沒有你的報刀或是傷害有誤')
                            return
                        }
                    }
                    break   
                // !check tag
                case 'check':
                    if(list[realCycle] === undefined){
                        message.channel.send('該週尚未有報刀')
                        return 
                    }
                    let checkMsg = '傷害僅供參考不與遊戲連動'
                    message.channel.send(createCycleMessage(realCycle, checkMsg))
                    break            
                
                case 'reboss':
                    if(checkMessage(realCycle, boss, message.channel, damage)){
                        if(checkDamage(note[0], message.channel)){
                            return
                        }
                        let found = list[realCycle][boss-1].filter(() => {
                            return userNickname
                        }).some((list) => {
                            return list.damage === Number(damage)
                        })
                        if(found){
                            let oldDamage = damage
                            let newDamage = note.shift()
                            let targetName = userNickname
                            let totalDamage = list[realCycle][boss-1].reduce((total, list) => {
                                return total + list.damage
                            }, 0)
                            if (Number(newDamage) <= 0){
                                message.channel.send('傷害必須為正')
                                return
                            } else if (list[realCycle][5][boss-1] - (totalDamage - Number(oldDamage) + Number(newDamage)) < 0){
                                message.channel.send('傷害過高 請與其他成員合刀')
                                return
                            }
                            rebossCommand(realCycle, boss, targetName, oldDamage, newDamage, note)
                            client.channels.cache.get(process.env.BOT_CHANNEL).send(message.author.toString() + `更新了第${realCycle+1}周第${boss}王的傷害`)
                            saveJSON('cycle.json', list)
                            return
                        } else {
                            message.channel.send('該週王沒有你的報刀或是傷害有誤')
                            return
                        }
                    }
                    break

                case 'create':
                    if( message.author.username == 'ユユ' || realCycle > list.length){   
                        client.channels.cache.get(process.env.BOT_CHANNEL).send(message.author.toString() + '執行create')
                        
                        let number = 0
                        for(number = list.length;number <= Number(realCycle);number = number + 1){
                            createCycle(number)
                        }
                        message.channel.send(`周目表已更新至${cycle}周`)
                        saveJSON('cycle.json', list)
                        
                        return
                    } else {
                        return
                    }
                default:
                    break
                }
        } else {
            message.channel.send('週目必須為數字且至少為1')
            return
        }
    } catch(err) {
        console.log(err)
    }
})

function createCycle(realCycle){
    let bossHp = createBossHP(realCycle + 1)
    list.push([
        [],
        [],
        [],
        [],
        [],
        bossHp
    ]);
}

function checkMessage(realCycle, boss, channel, damage){
    if(boss == undefined || boss>5 || boss<=0 || isNaN(Number(boss))){
        channel.send('BOSS有誤')
        return false
    }
    if(list[realCycle] === undefined){
        if(list[realCycle - 1] == undefined && realCycle != 0){
            channel.send('不要跨週報刀')
            return false
        }
        createCycle(realCycle);
    }
    if(checkDamage(damage, channel)){
        return false
    }
    return true
}
function checkDamage(damage, channel){
    if(damage == undefined){
        channel.send('請加上傷害數值')
        return true
    }else if(isNaN(Number(damage))) { // isNaN() will return ture or false. if prameter is NaN then return ture
        channel.send('傷害必須為數字')
        return true
    }
    return false
}
function createCycleMessage(realCycle, note){
    let print = '```\n' + `第${realCycle + 1}週\r\n`
    for(let n = 0;n <= 4;n++){
        let nameArray = list[realCycle][n].map((list) => {
            if(String(list.note) == ''){
                return `${list.name}` + `(${list.damage})`
            } else {
                let label = ''
                list.note.forEach((note) => {
                    return label = label + note
                })
                return list.name + `(${list.damage},${String(label)})`
            }
        })

        let totalDamage = list[realCycle][n].reduce((total, list) => {
            return total + list.damage
        }, 0)

        let bossHp =list[realCycle][5][n]
        let nokoriHp = bossHp-totalDamage
        let hp = `(${nokoriHp}/${bossHp})`

        print = print + `${n+1}王${hp}:${nameArray}\r\n`
    }

    note = '***備註：' + note.toString().replace(dot,' ') +'***\r\n'
    return print + '```' + note
}

function bossCommand(realCycle, boss, userNickname, damage, note = null){
    const userdata = { name:userNickname , damage:Number(damage) , note:note }
    list[realCycle][boss-1].push(userdata)
    return
}

function nobossCommand(realCycle, boss, targetName, damage){
    list[realCycle][boss-1].forEach(() => {
        let user = list[realCycle][boss-1].shift()
        if(user.name != targetName || user.damage != damage){
            list[realCycle][boss-1].push(user)
        }
    })
    return
}

function rebossCommand(realCycle, boss, targetName, oldDamage, newDamage, note = null){
    nobossCommand(realCycle, boss, targetName, oldDamage)
    bossCommand(realCycle, boss, targetName, newDamage, note)
    return
}

function createBossHP(realCycle) {
    let maxHP = []

    if (realCycle <= 10) {
        maxHP = [600, 800, 1000, 1200, 1500]
    } else if (realCycle >= 11 && realCycle <= 30) {
        maxHP = [1200, 1400, 1700, 1900, 2200]
    } else if (realCycle >= 31 && realCycle <= 40) {
        maxHP = [1900, 2000, 2300, 2500, 2700]
    } else {
        maxHP = [8500, 9000, 9500, 10000, 11000]
    }

    return maxHP
}

function readJSON(filename = ''){
    if(fs.existsSync(filename)){
        return JSON.parse(fs.readFileSync(filename))
    } else {
        console.log('Cannot find.')
        return
    }
}

function saveJSON(filename = '', list){
    fs.writeFileSync(filename, JSON.stringify(list))
    return
}