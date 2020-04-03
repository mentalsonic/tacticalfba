import React, { useState, useRef } from "react";
import { samples } from "../data";
import { db, storage } from "../config/Firebase";
import { EditorState, convertFromHTML, ContentState } from "draft-js";
import { stateToHTML } from "draft-js-export-html";
import htmlToImage from "html-to-image";

const InsertContext = React.createContext();

function InsertProvider(props) {
  const { pid, iid, history, user, inserts } = props;
  const frontRef = useRef();
  const backRef = useRef();
  let tempInsert = {};

  if (iid) {
    tempInsert = inserts.filter(insert => insert.iid === iid)[0];
  } else {
    tempInsert = samples.filter(sample => sample.pid === pid)[0];
  }

  const [content, setContent] = useState(tempInsert);

  // handle insert name
  const handleInsertName = e => {
    let newContent = Object.assign({}, content);
    newContent.iName = e.currentTarget.value;
    setContent(newContent);
  };

  // handle theme color
  const handleThemeColor = color => {
    let newContent = Object.assign({}, content);
    newContent.themeColor = color.hex;
    setContent(newContent);
  };

  // handle hover & over
  const [editorShow, setEditorShow] = useState(false);
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [item, setItem] = useState("");

  const onSelect = item => {
    setItem(item);
    setEditorShow(true);
    // get the default html of selected part
    const html = content[item];
    // set the default editor content
    const blocksFromHTML = convertFromHTML(html);
    const defaultContent = ContentState.createFromBlockArray(
      blocksFromHTML.contentBlocks,
      blocksFromHTML.entityMap
    );
    setEditorState(EditorState.createWithContent(defaultContent));
  };

  // handle editor
  const updateEditorState = editorState => {
    setEditorState(editorState);
    let contentState = editorState.getCurrentContent();
    let html = stateToHTML(contentState);
    let newContent = Object.assign({}, content);
    newContent[item] = html;
    setContent(newContent);
  };

  // handle image change
  const onSelectImg = e => {
    const file = e.currentTarget.files[0];
    const size = file.size / 1024;
    if (size > 300) {
      alert("300KB maximum file size.");
      e.currentTarget.value = "";
      return false;
    }
    const side = e.currentTarget.name;
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => {
        let newContent = Object.assign({}, content);
        // convert image file to base64 string
        newContent[side] = reader.result;
        setContent(newContent);
      },
      false
    );
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const [spin, setSpin] = useState(false);

  // upload insert

  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const genPreview = async arr => {
    let newContent = Object.assign({}, content);
    await htmlToImage
      .toJpeg(frontRef.current, { quality: 0.5 })
      .then(dataUrl => {
        newContent.frontPre = dataUrl;
        console.log("front preview converted");
      });
    await htmlToImage
      .toJpeg(backRef.current, { quality: 0.5 })
      .then(dataUrl => {
        newContent.backPre = dataUrl;
        console.log("back preview converted");
      });
    return newContent;
  };

  const genID = () => {
    return Number(
      Math.random()
        .toString()
        .substr(10) + Date.now()
    ).toString(36);
  };

  const uploadImg = async (arr, cb) => {
    let newContent = Object.assign({}, content);
    let count = 0;
    for await (const image of arr) {
      const imgID = genID();
      const ref = storage.ref(`/images/${imgID}`);
      const uploadTask = ref.putString(image.dataUrl, "data_url");
      uploadTask.on(
        "state_changed",
        snapShot => {
          //takes a snap shot of the process as it is happening
          // console.log(snapShot);
        },
        err => {
          //catches the errors
          console.log(err);
        },
        () => {
          storage
            .ref("images")
            .child(imgID)
            .getDownloadURL()
            .then(fireBaseUrl => {
              newContent[image.name] = fireBaseUrl;
              count++;
              console.log(image.name + " uploaded");
              if (count === arr.length) {
                console.log("images all uploaded");
                cb(newContent);
              }
            });
        }
      );
    }

    // for await (const image of arr) {
    //   const imgID = genID();
    //   const ref = storage.ref(`/images/${imgID}`);
    //   const uploadTask = ref.putString(image.dataUrl, "data_url");
    //   uploadTask.on(
    //     "state_changed",
    //     snapShot => {
    //       //takes a snap shot of the process as it is happening
    //       // console.log(snapShot);
    //     },
    //     err => {
    //       //catches the errors
    //       console.log(err);
    //     },
    //     () => {
    //       storage
    //         .ref("images")
    //         .child(imgID)
    //         .getDownloadURL()
    //         .then(fireBaseUrl => {
    //           newContent[image.name] = fireBaseUrl;
    //           console.log(image.name + " uploaded");
    //           count++;
    //           if (count === arr.length) {
    //             console.log("images all uploaded");
    //             cb(newContent);
    //             count = 0;
    //           }
    //         });
    //     }
    //   );
    // }
  };

  const saveToDb = data => {
    const ref = db
      .collection("users")
      .doc(user)
      .collection("insert");
    ref
      .add(data)
      .then(docRef => {
        const comb = {
          pid: pid,
          iid: docRef.id
        };
        localStorage.setItem("comb", JSON.stringify(comb));
        history.push("/address");
      })
      .catch(error => {
        console.log("Error writing document: ", error.message);
      });
  };

  const updateDb = data => {
    const ref = db
      .collection("users")
      .doc(user)
      .collection("insert")
      .doc(iid);
    ref
      .update(data)
      .then(docRef => {
        const comb = {
          pid: pid,
          iid: iid
        };
        localStorage.setItem("comb", JSON.stringify(comb));
        history.push("/address");
      })
      .catch(error => {
        console.log("Error writing document: ", error.message);
      });
  };

  const saveTemp = async () => {
    //check if insert name set
    if (content.iName.trim() === "") {
      setShow(true);
      setError("Please name your insert before saving.");
      return false;
    }
    //check if select images
    if (!content.frontImg.includes("data")) {
      setShow(true);
      setError("Please choose front image.");
      return false;
    }

    if (!content.rearImg.includes("data")) {
      setShow(true);
      setError("Please choose rear image.");
      return false;
    }

    await setSpin(true);

    const converted = await genPreview();

    const imgArr = [
      {
        dataUrl: converted.frontImg,
        name: "frontImg"
      },
      {
        dataUrl: converted.rearImg,
        name: "rearImg"
      },
      {
        dataUrl: converted.frontPre,
        name: "frontPre"
      },
      {
        dataUrl: converted.backPre,
        name: "backPre"
      }
    ];

    uploadImg(imgArr, saveToDb);
  };

  const saveAsNew = async () => {
    // check if insert name set
    if (content.iName.trim() === "") {
      setShow(true);
      setError("Please name your insert before save!");
      return false;
    }
    await setSpin(true);
    const converted = await genPreview();
    let imgArr = [
      {
        dataUrl: converted.frontPre,
        name: "frontPre"
      },
      {
        dataUrl: converted.backPre,
        name: "backPre"
      }
    ];
    if (content.frontImg.includes("data")) {
      imgArr.push({
        dataUrl: converted.frontImg,
        name: "frontImg"
      });
    }
    if (content.rearImg.includes("data")) {
      imgArr.push({
        dataUrl: converted.rearImg,
        name: "rearImg"
      });
    }
    uploadImg(imgArr, saveToDb);
  };

  const updateTemp = async () => {
    // check if insert name set
    if (content.iName.trim() === "") {
      setShow(true);
      setError("Please name your insert before save!");
      return false;
    }
    await setSpin(true);
    const converted = await genPreview();
    let imgArr = [
      {
        dataUrl: converted.frontPre,
        name: "frontPre"
      },
      {
        dataUrl: converted.backPre,
        name: "backPre"
      }
    ];
    if (content.frontImg.includes("data")) {
      imgArr.push({
        dataUrl: converted.frontImg,
        name: "frontImg"
      });
    }
    if (content.rearImg.includes("data")) {
      imgArr.push({
        dataUrl: converted.rearImg,
        name: "rearImg"
      });
    }
    uploadImg(imgArr, updateDb);
  };

  return (
    <InsertContext.Provider
      value={{
        frontRef: frontRef,
        backRef: backRef,
        content: content,
        spin: spin,
        user: user,
        editorShow: editorShow,
        editorState: editorState,
        item: item,
        handleInsertName: handleInsertName,
        handleThemeColor: handleThemeColor,
        onSelect: onSelect,
        updateEditorState: updateEditorState,
        onSelectImg: onSelectImg,
        saveTemp: saveTemp,
        show: show,
        error: error,
        updateTemp: updateTemp,
        saveAsNew: saveAsNew
      }}
    >
      {props.children}
    </InsertContext.Provider>
  );
}

const InsertConsumer = InsertContext.Consumer;

export { InsertProvider, InsertConsumer };
