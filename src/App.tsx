import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Ultra-minimal test to verify React works at all
const TestComponent = () => {
  console.log("TestComponent rendering...");
  
  const [test, setTest] = React.useState("React is working!");
  
  React.useEffect(() => {
    console.log("React useEffect working!");
    setTest("React + useEffect working!");
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ 
        color: 'white', 
        textAlign: 'center',
        padding: '2rem',
        fontSize: '24px'
      }}>
        <h1 style={{ fontSize: '48px', marginBottom: '1rem' }}>{test}</h1>
        <p>If you can see this, React core is working</p>
        <button 
          onClick={() => setTest("Button click works!")}
          style={{
            marginTop: '1rem',
            padding: '12px 24px',
            fontSize: '18px',
            backgroundColor: 'white',
            color: '#667eea',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Test Click
        </button>
      </div>
    </div>
  );
};

const App = () => {
  console.log("App component rendering without QueryClient...");
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<TestComponent />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;