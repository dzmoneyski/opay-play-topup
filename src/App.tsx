import React from "react";

// Absolute minimal React test - no external libraries at all
const App = () => {
  console.log("App rendering - React object:", React);
  console.log("React.useState:", React.useState);
  console.log("React.useEffect:", React.useEffect);
  
  const [message, setMessage] = React.useState("Pure React Test");
  
  React.useEffect(() => {
    console.log("Pure React useEffect working!");
    setMessage("React hooks are working!");
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#1a1a1a',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>{message}</h1>
      <p style={{ fontSize: '20px', marginBottom: '20px' }}>
        If you see this, pure React is working
      </p>
      <button 
        onClick={() => setMessage("Button click works!")}
        style={{
          padding: '12px 24px',
          fontSize: '18px',
          backgroundColor: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Test React State
      </button>
    </div>
  );
};

export default App;