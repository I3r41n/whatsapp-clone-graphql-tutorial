import React from 'react';
import { useCallback } from 'react';
import styled from 'styled-components';
import ChatNavbar from './ChatNavbar';
import MessageInput from './MessageInput';
import MessagesList from './MessagesList';
import { History } from 'history';
import { useGetChatQuery, useAddMessageMutation } from '../../graphql/types';
import { writeMessage } from '../../services/cache.service';
import { Redirect } from 'react-router-dom';

const Container = styled.div`
  background: url(/assets/chat-background.jpg);
  display: flex;
  flex-flow: column;
  height: 100vh;
`;

interface ChatRoomScreenParams {
  chatId: string;
  history: History;
}

const ChatRoomScreen: React.FC<ChatRoomScreenParams> = ({
  history,
  chatId,
}) => {
  const { data, loading } = useGetChatQuery({
    variables: { chatId },
  });
  const [addMessage] = useAddMessageMutation();

  const onSendMessage = useCallback(
    (content: string) => {
      const chat = data && data.chat;
      if (!chat) return null;

      addMessage({
        variables: { chatId, content },
        optimisticResponse: {
          __typename: 'Mutation',
          addMessage: {
            __typename: 'Message',
            id: Math.random()
              .toString(36)
              .substr(2, 9),
            createdAt: new Date(),
            isMine: true,
            chat: {
              __typename: 'Chat',
              id: chatId,
            },
            content,
          },
        },
        update: (client, { data }) => {
          data && data.addMessage && writeMessage(client, data.addMessage);
        },
      });
    },
    [data, chatId, addMessage]
  );

  if (loading || !(data && data.chat)) return null;

  return !data.chat ? (
    <Redirect to="/chats" />
  ) : (
    <Container>
      <ChatNavbar chat={data.chat} history={history} />
      {data.chat.messages && <MessagesList messages={data.chat.messages} />}
      <MessageInput onSendMessage={onSendMessage} />
    </Container>
  );
};

export default ChatRoomScreen;
