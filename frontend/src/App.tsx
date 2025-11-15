import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { RunForm } from "./components/RunForm";
import { RunsList } from "./components/RunsList";
import { RunDetail } from "./components/RunDetail";
import { TasksManager } from "./components/TasksManager";
import "./styles.css";

function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <div className="header">
      <div className="container">
        <h1>QA AI Tester</h1>
        <p>AI-powered automated quality assurance testing</p>
        <nav className="nav">
          <Link to="/" className={isActive("/")}>
            Start Run
          </Link>
          <Link to="/runs" className={isActive("/runs")}>
            Run History
          </Link>
          <Link to="/tasks" className={isActive("/tasks")}>
            Tasks
          </Link>
        </nav>
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="container">
      <RunForm />
    </div>
  );
}

function Runs() {
  return (
    <div className="container">
      <RunsList />
    </div>
  );
}

function RunDetailPage() {
  return (
    <div className="container">
      <RunDetail />
    </div>
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
