import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ErrorBoundary } from './ErrorBoundary';

// This is required to recover all logs from ErrorBoundary in case of app crash
if (console.everything === undefined) {
    console.everything = [];

    console.defaultLog = console.log.bind(console);
    console.log = function() {
        console.everything.push({"type": "log", "datetime": Date().toLocaleString(), "value": Array.from(arguments)});
        console.defaultLog.apply(console, arguments);
    }
    console.defaultError = console.error.bind(console);
    console.error = function() {
        console.everything.push({"type": "error", "datetime": Date().toLocaleString(), "value": Array.from(arguments)});
        console.defaultError.apply(console, arguments);
    }
    console.defaultWarn = console.warn.bind(console);
    console.warn = function() {
        console.everything.push({"type": "warn", "datetime": Date().toLocaleString(), "value": Array.from(arguments)});
        console.defaultWarn.apply(console, arguments);
    }
    console.defaultDebug = console.debug.bind(console);
    console.debug = function() {
        console.everything.push({"type": "debug", "datetime": Date().toLocaleString(), "value": Array.from(arguments)});
        console.defaultDebug.apply(console, arguments);
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
