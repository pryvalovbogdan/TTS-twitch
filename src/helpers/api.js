import axios from 'axios';

import { TWITCH_BASE_URL } from './consts.js';

//https://dev.twitch.tv/docs/api/reference#delete-chat-messages
export async function deleteMessage(messageId, channelId) {
  console.log('Attempting to delete message:', messageId, 'in channel:', channelId);

  try {
    const response = await axios.delete(`${TWITCH_BASE_URL}chat`, {
      params: {
        broadcaster_id: channelId,
        moderator_id: process.env.TWITCH_USER_ID,
        message_id: messageId,
      },
      headers: {
        Authorization: `Bearer ${process.env.TWITCH_ACCESS_TOCKEN}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID,
      },
    });

    console.log('API Response Status:', response.status);
    console.log('Message deletion API call successful');

    return true;
  } catch (error) {
    console.error('Failed to delete message via API:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Headers:', error.response?.headers);

    // Check for specific error cases
    if (error.response?.status === 403) {
      console.error(
        'Insufficient permissions - ensure your token has moderation:read and moderator:manage:chat_messages scopes',
      );
    } else if (error.response?.status === 404) {
      console.error('Message not found or already deleted');
    }

    return false;
  }
}

//https://dev.twitch.tv/docs/chat/moderation#putting-a-user-in-a-timeout
export async function timeOutUser(userId, channelId, duration = 300, reason = 'Automated moderation') {
  console.log(`Attempting to timeout user ${userId} for ${duration} seconds`);

  try {
    const response = await axios.post(
      `${TWITCH_BASE_URL}bans`,
      {
        data: {
          user_id: userId,
          duration: duration,
          reason: reason,
        },
      },
      {
        params: {
          broadcaster_id: channelId,
          moderator_id: process.env.TWITCH_USER_ID,
        },
        headers: {
          Authorization: `Bearer ${process.env.TWITCH_ACCESS_TOCKEN}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('Timeout API Response Status:', response.status);
    console.log('User timeout successful');

    return true;
  } catch (error) {
    console.error('Failed to timeout user via API:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);

    if (error.response?.status === 403) {
      console.error('Insufficient permissions - ensure your token has moderator:manage:banned_users scope');
    } else if (error.response?.status === 400) {
      console.error('Bad request - check user ID and parameters');
    }

    return false;
  }
}
