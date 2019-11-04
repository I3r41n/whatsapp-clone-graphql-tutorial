import { withFilter } from 'apollo-server-express';
import { DateTimeResolver, URLResolver } from 'graphql-scalars';
import { Message, chats, messages, Chat, User, users } from '../db';
import { Resolvers } from '../types/graphql';
import { secret, expiration } from '../env';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validateLength, validatePassword } from '../validators';

const resolvers: Resolvers = {
  Date: DateTimeResolver,
  URL: URLResolver,

  Message: {
    chat(message) {
      return chats.find(c => c.messages.some(m => m === message.id)) || null;
    },

    sender(message) {
      return users.find(u => u.id === message.sender) || null;
    },

    recipient(message) {
      return users.find(u => u.id === message.recipient) || null;
    },

    isMine: (message, _, { currentUser }) => message.sender === currentUser.id,
  },

  Chat: {
    name(chat, _, { currentUser }) {
      const participantId =
        currentUser && chat.participants.find(p => p !== currentUser.id);
      const participant = users.find(u => u.id === participantId);
      return participant ? participant.name : null;
    },

    picture(chat, _, { currentUser }) {
      const participantId =
        currentUser && chat.participants.find(p => p !== currentUser.id);
      const participant = users.find(u => u.id === participantId);
      return participant && participant.picture || null;
    },

    messages(chat) {
      return messages.filter(m => chat.messages.includes(m.id));
    },

    lastMessage(chat) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      return messages.find(m => m.id === lastMessage) || null;
    },

    participants(chat) {
      return chat.participants
        .map(p => users.find(u => u.id === p))
        .filter(Boolean) as User[];
    },
  },

  Query: {
    me: (_, __, {currentUser}) => currentUser || null,
    chats: (_, __, { currentUser }) =>
      currentUser
        ? chats.filter(c => c.participants.includes(currentUser.id))
        : [],

    chat(_, { chatId }, { currentUser }) {
      const chat = chats.find(c => c.id === chatId) || null;
      const isCurrentParticipant =
        !!currentUser &&
        !!chat &&
        chat.participants &&
        chat.participants.includes(currentUser.id);

      return isCurrentParticipant ? chat : null;
    },

    users: (_, __, { currentUser }) =>
      currentUser ? users.filter(u => u.id !== currentUser.id) : [],
  },

  Mutation: {
    addMessage(_, { chatId, content }, { currentUser, pubsub }) {
      if (!currentUser) return null;

      const chatIndex = chats.findIndex(c => c.id === chatId);

      if (chatIndex === -1) return null;

      const chat = chats[chatIndex];
      if (!chat.participants.includes(currentUser.id)) return null;

      const messagesIds = messages.map(currentMessage =>
        Number(currentMessage.id)
      );
      const messageId = String(Math.max(...messagesIds) + 1);
      const message: Message = {
        id: messageId,
        createdAt: new Date(),
        content,
        sender: currentUser.id,
        recipient: chat.participants.find(p => p !== currentUser.id) as string,
      };

      messages.push(message);
      chat.messages.push(messageId);
      // The chat will appear at the top of the ChatsList component
      chats.splice(chatIndex, 1);
      chats.unshift(chat);

      pubsub.publish('messageAdded', {
        messageAdded: message,
      });

      return message;
    },

    addChat: (_, { recipientId }, { currentUser, pubsub }) => {
      if (!currentUser || !users.some(u => u.id === recipientId)) return null;

      const chat = chats.find(
        c =>
          c.participants.includes(currentUser.id) &&
          c.participants.includes(recipientId)
      );

      if (chat) return chat;

      const chatsIds = chats.map(c => Number(c.id));

      const newChat = ({
        id: String(Math.max(...chatsIds) + 1),
        participants: [currentUser.id, recipientId],
        messages: [],
      } as any) as Chat;

      chats.push(newChat);

      pubsub.publish('chatAdded', {
        chatAdded: chat,
      });

      return newChat;
    },

    removeChat: (_, { chatId }, { currentUser, pubsub }) => {
      const chatIndex = chats.findIndex(c => c.id === chatId);
      if (!currentUser || chatIndex === -1) return null;

      const chat = chats[chatIndex];

      if (!chat.participants.some(p => p === currentUser.id)) return null;

      chat.messages.forEach(chatMessage => {
        const chatMessageIndex = messages.findIndex(m => m.id === chatMessage);

        if (chatMessageIndex !== -1) {
          messages.splice(chatMessageIndex, 1);
        }
      });

      chats.splice(chatIndex, 1);

      pubsub.publish('chatRemoved', {
        chatRemoved: chat.id,
        targetChat: chat,
      });

      return chatId;
    },

    signIn: (_, { username, password }, { res }) => {
      const user = users.find(u => u.username === username);
      if (!user) throw new Error('user not found');

      const passwordsMatch = bcrypt.compareSync(password, user.password);
      if (!passwordsMatch) throw new Error('password is incorrect');

      const authToken = jwt.sign(username, secret);
      res.cookie('authToken', authToken, { maxAge: expiration });
      return user;
    },

    signUp(_, { name, username, password, passwordConfirm }) {
        validateLength('req.name', name, 3, 50);
        validateLength('req.username', username, 3, 18);
        validatePassword('req.password', password);

        if (password !== passwordConfirm) {
          throw Error("req.password and req.passwordConfirm don't match");
        }

        if (users.some(u => u.username === username)) {
          throw Error('username already exists');
        }

        const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(8));

        const user: User = {
          id: String(users.length + 1),
          password: passwordHash,
          username,
          name,
        };

        users.push(user);

        return user;
      },
  },

  Subscription: {
    messageAdded: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator('messageAdded'),
        ({ messageAdded }, _, { currentUser }) =>
          !!currentUser &&
          [messageAdded.sender, messageAdded.recipient].includes(currentUser.id)
      ),
    },

    chatAdded: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator('chatAdded'),
        ({ chatAdded }: { chatAdded: Chat }, _, { currentUser }) => {
          return (
            !!currentUser &&
            chatAdded.participants.some(p => p === currentUser.id)
          );
        }
      ),
    },

    chatRemoved: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator('chatRemoved'),
        ({ targetChat }: { targetChat: Chat }, _, { currentUser }) =>
          !!currentUser &&
          targetChat.participants.some(p => p === currentUser.id)
      ),
    },
  },
};

export default resolvers;
