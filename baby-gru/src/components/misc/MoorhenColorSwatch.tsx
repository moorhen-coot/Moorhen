import Brightness1Icon from '@mui/icons-material/Brightness1';
import IconButton from '@mui/material/IconButton';
import { hexToRGB } from "../../utils/utils";
import { Grid } from "@mui/material";

export const MoorhenColorSwatch = (props => {
    const size = (typeof props.size === 'undefined') ? 20 : parseInt(props.size)
    const columns = (typeof props.columns === 'undefined') ? 5 : parseInt(props.columns)

    return <>
              <Grid container minHeight={size} columns={columns}>
                  {props.cols.map((c,i) => {
                      return (
                         <Grid display="flex" justifyContent="center" alignItems="center" key={i} size={1}>
                         <IconButton sx={{ padding: 0, margin: 0, maxWidth: size, maxHeight: size }} aria-label="redirect" onClick={(e) => props.onClick(c)}>
                         <Brightness1Icon sx={{ padding: 0, margin: 0, color: c, maxWidth: size, maxHeight: size }} />
                         </IconButton>
                         </Grid>
                       
                      )
                  }) }
              </Grid>
           </>
})
