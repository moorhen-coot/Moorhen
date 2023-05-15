import { useEffect } from "react";
import Draggable from "react-draggable";
import { Card } from "react-bootstrap";
import { StandaloneStructServiceProvider } from 'ketcher-standalone'
import { Editor } from 'ketcher-react'
import 'ketcher-react/dist/index.css'

const structServiceProvider = new StandaloneStructServiceProvider()

const ketcherModal = () => {
    useEffect(() => {
        const downloadButton = document.getElementsByClassName('Save-module_ok__SgeCM')
        console.log(downloadButton)
        if(downloadButton.lenght > 0){
          downloadButton[0]?.addEventListener('click', handleDownload);
        }
        
    
        return () => {
          if(downloadButton.lenght > 0){
            downloadButton[0]?.removeEventListener('click', handleDownload);
          }
          };
      }, []);
    
    const handleDownload = (event) => {
        // Check if the download event was triggered by the child component
        console.log(event)
        event.stopPropagation()
        if (event.target.matches('.child-download-button')) {
          // Intercept the event and perform additional actions
          event.preventDefault(); // Prevent the default download behavior
          console.log('Download intercepted!');
          // Perform additional actions as needed
        }
      };
    

    return (
    <Draggable>
      <Card>
        <Card.Header>
          This is a ketcher test
        </Card.Header>
        <Card.Body>
        <Editor
          staticResourcesUrl={process.env.PUBLIC_URL}
          structServiceProvider={structServiceProvider}
        />
        </Card.Body>
        <Card.Footer>
          This is a footer
        </Card.Footer>
      </Card>
    </Draggable>
    
  )
}
