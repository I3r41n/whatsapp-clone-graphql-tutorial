import React from 'react';
import { BrowserRouter, Route, Redirect, RouteComponentProps, Switch } from 'react-router-dom';
import ChatsListScreen from './components/ChatsListScreen';
import ChatRoomScreen from './components/ChatRoomScreen';
import { withAuth } from './services/auth.service';
import AuthScreen from './components/AuthScreen';
import ChatCreationScreen from './components/ChatCreationScreen';

const App: React.FC = () => {
  return <BrowserRouter>
    <Switch>
      <Route exact path="/sign-(in|up)" component={AuthScreen} />
      <Route exact path='/chats' component={withAuth(ChatsListScreen)} />
      <Route exact path='/chats/:chatId'
        component={withAuth(({ match, history }: RouteComponentProps<{ chatId: string }>) => (
          <ChatRoomScreen chatId={match.params.chatId} history={history}/>
        ))} />
        <Route exact path="/new-chat" component={withAuth(ChatCreationScreen)} />
    </Switch>
    <Route exact path="/" render={redirectToChats} />
  </BrowserRouter>
};

const redirectToChats = () => <Redirect to="/chats" />;

export default App;
