

import { v4 as uuidv4 } from 'uuid';


export const postCootMessage = (cootWorker, kwargs) => {
    const messageId = uuidv4()
    return new Promise((resolve, reject) => {
        const messageListener = cootWorker.current.addEventListener('message', (reply) => {
            if (reply.data.messageId === messageId) {
                //I'm now 90% certain that this does not in fact remove the eventListener...
                cootWorker.current.removeEventListener('message', messageListener)
                console.log(`Completed in `, Date.now() - reply.data.myTimeStamp)
                resolve(reply)
            }
        })
        const messageEvent = new CustomEvent('coot_message_dispatch', { detail: { messageId: messageId } })
        document.dispatchEvent(messageEvent)
        cootWorker.current.postMessage({
            messageId, myTimeStamp: Date.now(), ...kwargs
        })
    })
}

export const cootCommand = (cootWorker, commandSpec) => {
    const message = "coot_command"
    const returnType = commandSpec.returnType
    return postCootMessage(cootWorker, { message, returnType, ...commandSpec })
}

export const readTextFile = (source) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const loadListener = reader.addEventListener("load", () => {
            reader.removeEventListener("load", loadListener)
            resolve(reader.result)
        })
        reader.readAsText(source);
    })
}

export const readDataFile = (source) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const loadListener = reader.addEventListener("load", () => {
            reader.removeEventListener("load", loadListener)
            resolve(reader.result)
        })
        reader.readAsArrayBuffer(source)
    })
}

export const doDownload = (data, targetName) => {
    const url = window.URL.createObjectURL(
        new Blob(data),
    );
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
        'download',
        targetName,
    );

    // Append to html link element page
    document.body.appendChild(link);

    // Start download
    link.click();

    // Clean up and remove the link
    link.parentNode.removeChild(link);
}

export const doDownloadText = (text, filename) => {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
  }