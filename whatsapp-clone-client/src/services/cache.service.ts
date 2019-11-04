import {
  ChatFragment,
  FullChatFragment,
  MessageFragment,
  useChatAddedSubscription,
  useChatRemovedSubscription,
  useMessageAddedSubscription,
  Query,
  Chat,
} from './../graphql/types';
import { DataProxy } from 'apollo-cache';
import { defaultDataIdFromObject } from 'apollo-cache-inmemory';
import * as fragments from '../graphql/fragments';
import * as queries from '../graphql/queries';

export const useCacheService = () => {
  useMessageAddedSubscription({
    onSubscriptionData: ({ client, subscriptionData: { data } }) =>
      data && writeMessage(client, data.messageAdded),
  });

  useChatRemovedSubscription({
    onSubscriptionData: ({ client, subscriptionData: { data } }) =>
      data && eraseChat(client, data.chatRemoved),
  });

  useChatAddedSubscription({
    onSubscriptionData: ({ client, subscriptionData: { data } }) =>
      data && writeChat( client, data.chatAdded),
  });
};

export const writeMessage = (client: DataProxy, message: MessageFragment) => {
  let fullChat;

  const chatIdFromStore = defaultDataIdFromObject(message.chat);

  if (chatIdFromStore === null) {
    return;
  }
  try {
    fullChat = client.readFragment<FullChatFragment>({
      id: chatIdFromStore,
      fragment: fragments.fullChat,
      fragmentName: 'FullChat',
    });
  } catch (e) {
    return;
  }

  if (fullChat === null || fullChat.messages === null) {
    return;
  }
  if (fullChat.messages.some((m: any) => m.id === message.id)) return;

  fullChat.messages.push(message);
  fullChat.lastMessage = message;

  client.writeFragment({
    id: chatIdFromStore,
    fragment: fragments.fullChat,
    fragmentName: 'FullChat',
    data: fullChat,
  });

  try {
    const data = client.readQuery<Query>({
      query: queries.chats,
    });

    if (!data || data === null || !data.chats || data.chats === undefined)
      return null;

    const chats = data.chats;

    const chatIndex = chats.findIndex(c => {
      if (message === null || message.chat === null) return -1;
      return c.id === message.chat.id;
    });

    if (chatIndex === -1) return;
    const chatWhereAdded = chats[chatIndex];

    // The chat will appear at the top of the ChatsList component
    chats.splice(chatIndex, 1);
    chats.unshift(chatWhereAdded);

    client.writeQuery({
      query: queries.chats,
      data: { chats },
    });
  } catch (e) {
    return;
  }
};



export const writeChat = (client: DataProxy, chat: ChatFragment) => {
  const chatId = defaultDataIdFromObject(chat);
  if (chatId === null) return;

  client.writeFragment({
    id: chatId,
    fragment: fragments.chat,
    fragmentName: 'Chat',
    data: chat,
  });

  try {
    const data = client.readQuery<Query>({
      query: queries.chats,
    });

    if (!data || !data.chats) return;

    const chats = data.chats;
    if (chats.some((c: any) => c.id === chat.id)) return;

    chats.unshift(chat as any as Chat);
    client.writeQuery({
      query: queries.chats,
      data: { chats },
    });
  } catch (e) {
    return;
  }
};



export const eraseChat = (client: DataProxy, chatId: string) => {
  const chatType = {
    __typename: 'Chat',
    id: chatId,
  };

  const chatIdFromObject = defaultDataIdFromObject(chatType);
  if (chatIdFromObject === null) {
    return;
  }

  client.writeFragment({
    id: chatIdFromObject,
    fragment: fragments.fullChat,
    fragmentName: 'FullChat',
    data: null,
  });

  try {
    const data = client.readQuery<Query>({
      query: queries.chats,
    });

    if (!data || !data.chats) return;

    const chats = data.chats;
    const chatIndex = chats.findIndex(c => c.id === chatId);

    if (chatIndex === -1) return;

    // The chat will appear at the top of the ChatsList component
    chats.splice(chatIndex, 1);

    client.writeQuery({
      query: queries.chats,
      data: { chats },
    });

  } catch (e) {
    return;
  }
};
