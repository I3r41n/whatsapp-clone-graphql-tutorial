import gql from 'graphql-tag';
import * as fragments from '../fragments';

export default gql`
  query Chats {
    chats {
      ...Chat
      }
    }
  ${fragments.chat}
`;

export const getChatQuery = gql`
  query GetChat($chatId: ID!) {
    chat(chatId: $chatId) {
      ...FullChat
    }
  }
  ${fragments.fullChat}
`;

export const addMessageMutation = gql`
  mutation AddMessage($chatId: ID!, $content: String!) {
    addMessage(chatId: $chatId, content: $content) {
      ...Message
    }
  }
  ${fragments.message}
`;