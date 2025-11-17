import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { RunForm } from "./components/RunForm";
import { RunsList } from "./components/RunsList";
import { RunDetail } from "./components/RunDetail";
import { TasksManager } from "./components/TasksManager";
import {
  Header,
  HeaderContainer,
  Title,
  Subtitle,
  Nav,
  NavLink,
  Container,
} from "./App.styled";

function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Header>
      <HeaderContainer>
        <Title>QA AI Tester</Title>
        <Subtitle>AI-powered automated quality assurance testing</Subtitle>
        <Nav>
          <NavLink to="/" $isActive={isActive("/")}>
            Start Run
          </NavLink>
          <NavLink to="/runs" $isActive={isActive("/runs")}>
            Run History
          </NavLink>
          <NavLink to="/tasks" $isActive={isActive("/tasks")}>
            Tasks
          </NavLink>
        </Nav>
      </HeaderContainer>
    </Header>
  );
}

function Home() {
  return (
    <Container>
      <RunForm />
    </Container>
  );
}

function Runs() {
  return (
    <Container>
      <RunsList />
    </Container>
  );
}

function RunDetailPage() {
  return (
    <Container>
      <RunDetail />
    </Container>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/runs" element={<Runs />} />
        <Route path="/runs/:runId" element={<RunDetailPage />} />
        <Route path="/tasks" element={<TasksManager />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
