import { useState } from "react";
import { MoorhenSpinner } from "../../icons";
import { MoorhenIcon } from "../../icons/MoorhenIcon";
import { MoorhenInfoCard, MoorhenStack } from "../../interface-base";
import "./files-input.css";

export type FilesInputProps = {
    label?: string;
    extraTooltip?: string;
    ref?: React.RefObject<HTMLInputElement>;
    onChange?: ((e: React.ChangeEvent<HTMLInputElement>) => void) | (() => void);
    accept?: string;
    multiple?: boolean;
    isLoading?: boolean;
    className?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
};

export const MoorhenFileInput = (props: FilesInputProps) => {
    const { label, extraTooltip, ref, onChange, accept, multiple = false, isLoading = false, className, style, disabled } = props;
    const [selectedFiles, setSelectedFiles] = useState<string>("No files selected");

    const handleSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const fileNames = Array.from(files)
                .map(f => f.name)
                .join(", ");
            if (fileNames.length > 14) {
                setSelectedFiles(`${files.length} Files loading...`);
            } else {
                setSelectedFiles(fileNames);
            }
        } else {
            setSelectedFiles("No files selected");
        }
        onChange(e);
    };

    return (
        <div>
            <MoorhenStack direction="line">
                {label && <label htmlFor="upload-form">{label}</label>}
                {extraTooltip && (
                    <>
                        &nbsp;
                        <MoorhenInfoCard infoText={extraTooltip} />
                    </>
                )}
            </MoorhenStack>
            <div className={`moorhen__input-files-container ${className}`} style={{ ...style }}>
                <label
                    htmlFor="upload-form"
                    className={`moorhen__button__default moorhen__input-files-button ${disabled ? "disabled" : ""}`}
                    style={{ cursor: disabled ? "default" : "pointer", height: "2.2rem" }}
                >
                    <MoorhenIcon size="medium" moorhenSVG="MatSymFileOpen" />
                     Browse... 
                    <input
                        disabled={disabled}
                        id="upload-form"
                        className="moorhen__input-files-upload"
                        type="file"
                        accept={accept}
                        multiple={multiple}
                        onChange={handleSelection}
                        ref={ref}
                    />
                </label>
                <div className="moorhen__input-files-textfield">
                    <span style={{ flex: 1 }}>{selectedFiles}</span>
                    {isLoading && (
                        <span>
                            <MoorhenSpinner />
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
