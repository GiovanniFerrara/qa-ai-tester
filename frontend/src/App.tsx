import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { RunForm } from "./components/RunForm";
import { RunsList } from "./components/RunsList";
import { RunDetail } from "./components/RunDetail";
import { TasksManager } from "./components/TasksManager";
import { TestSuites } from "./components/TestSuites";
import { TestSuiteForm } from "./components/TestSuiteForm";
import { SuiteRunsList } from "./components/SuiteRunsList";
import { SuiteRunDetail } from "./components/SuiteRunDetail";
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
            Test Reports
          </NavLink>
          <NavLink to="/tasks" $isActive={isActive("/tasks")}>
            Test Cases
          </NavLink>
          <NavLink to="/test-suites" $isActive={isActive("/test-suites")}>
            Test Suites
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
        <Route
          path="/test-suites"
          element={
            <Container>
              <TestSuites />
            </Container>
          }
        />
        <Route
          path="/test-suites/new"
          element={
            <Container>
              <TestSuiteForm />
            </Container>
          }
        />
        <Route
          path="/test-suites/:collectionId/edit"
          element={
            <Container>
              <TestSuiteForm />
            </Container>
          }
        />
        <Route
          path="/test-suites/:collectionId/runs"
          element={
            <Container>
              <SuiteRunsList />
            </Container>
          }
        />
        <Route
          path="/test-suites/:collectionId/runs/:runId"
          element={
            <Container>
              <SuiteRunDetail />
            </Container>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
