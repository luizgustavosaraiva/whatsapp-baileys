const chalk = require('chalk');
import {
  WAConnection,
  MessageType,
  Presence,
  MessageOptions,
  Mimetype,
  WALocationMessage,
  WA_MESSAGE_STUB_TYPES,
  ReconnectMode,
  ProxyAgent,
  waChatKey,
} from '@adiwajshing/baileys';
import * as fs from 'fs';
import { User } from './models/user';
import { getIfoodPromotion, renderPromoFood } from './services/ifood';
import { findUser, insertUser, updateUser } from './services/supabase';

async function example() {
  const conn = new WAConnection();
  conn.autoReconnect = ReconnectMode.onConnectionLost;
  conn.connectOptions.maxRetries = 10;
  conn.chatOrderingKey = waChatKey(true); // order chats such that pinned chats are on top
  //conn.logger.level = 'warn'; // set to 'debug' to see what kind of stuff you can implement

  conn.on('chats-received', ({ hasNewChats }) => {
    console.log(
      `you have ${conn.chats.length} chats, new chats available: ${hasNewChats}`
    );
  });
  conn.on('contacts-received', () => {
    console.log(`you have ${Object.keys(conn.contacts).length} contacts`);
  });
  conn.on('initial-data-received', () => {
    console.log('received all initial messages');
  });

  // loads the auth file credentials if present
  fs.existsSync(__dirname + '/auth_info.json') &&
    conn.loadAuthInfo(__dirname + '/auth_info.json');

  await conn.connect();

  // credentials are updated on every connect
  const authInfo = conn.base64EncodedAuthInfo(); // get all the auth info we need to restore this session
  fs.writeFileSync(
    __dirname + '/auth_info.json',
    JSON.stringify(authInfo, null, '\t')
  ); // save this info to a file

  //The universal event for anything that happens
  conn.on('chat-update', async (chat) => {
    const userNumber = chat.jid.split('@')[0].trim();

    let users: User[] = [];

    // if (chat.presences) {
    //   // receive presence updates -- composing, available, etc.
    //   Object.values(chat.presences).forEach((presence) =>
    //     console.log(
    //       `${presence.name}'s presence is ${presence.lastKnownPresence} in ${chat.jid}`
    //     )
    //   );
    // }

    if (chat.imgUrl) {
      console.log('imgUrl of chat changed ', chat.imgUrl);
      return;
    }
    // only do something when a new message is received
    if (chat.hasNewMessage) {
      //#region Check if user exists
      let users = await findUser({
        name: chat.name ?? 'novo usuário',
        number: userNumber,
      });

      if (!users?.length) {
        users = await insertUser({
          name: chat.name ?? 'novo usuário',
          number: userNumber,
          latitude: null,
          longitude: null,
        });
      }

      if (
        !users[0]?.latitude &&
        chat.messages?.first.message?.locationMessage
      ) {
        users[0].latitude =
          chat.messages?.first.message?.locationMessage.degreesLatitude?.toString();
        users[0].longitude =
          chat.messages?.first.message?.locationMessage.degreesLongitude?.toString();
        users = await updateUser(users[0]);
      }
      //#endregion

      if (chat.messages) {
        const isCommand =
          chat.messages.first.message?.conversation?.startsWith('/');
        let [command, value] =
          chat.messages.first.message?.conversation?.split(' ');

        switch (command) {
          case '/promo':            
            if (!users[0]?.latitude) {
              conn.sendMessage(
                chat.jid,
                'Por favor envie sua localização',
                MessageType.text
              );
            } else {
              renderPromoFood(
                await getIfoodPromotion(
                  {
                    lat: users[0]?.latitude,
                    lon: users[0]?.longitude,
                  },
                  value
                )
              )?.forEach((element) => {
                conn.sendMessage(chat.jid, element.message, MessageType.text);
              });
            }
            break;

          default:
            break;
        }        
        // for (let index = 0; index < chat.messages.length; index++) {
        //   const locationMessage = chat.messages.first.message?.locationMessage;
        //   if (locationMessage) {
        //     renderPromoFood(
        //       await getIfoodPromotion(
        //         {
        //           lat: locationMessage.degreesLatitude,
        //           lon: locationMessage.degreesLongitude,
        //         },
        //         'açaí'
        //       )
        //     )?.forEach((element) => {
        //       conn.sendMessage(chat.jid, element.message, MessageType.text);
        //     });
        //   }
        // }
      }
      return;
    }
  });

  /* example of custom functionality for tracking battery */
  conn.on('CB:action,,battery', (json) => {
    const batteryLevelStr = json[2][0][1].value;
    const batterylevel = parseInt(batteryLevelStr);
    console.log('battery level: ' + batterylevel);
  });
  conn.on('close', ({ reason, isReconnecting }) =>
    console.log(
      'oh no got disconnected: ' + reason + ', reconnecting: ' + isReconnecting
    )
  );
}

example().catch((err) => console.log(`encountered error: ${err}`));
