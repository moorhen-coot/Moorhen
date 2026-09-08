import { MoorhenGrid } from '../interface-base/Stack/Grid';
import { MoorhenButton } from '../inputs';

export const MoorhenColorSwatch = (props => {
    const size = (typeof props.size === 'undefined') ? 20 : parseInt(props.size)
    const columns = (typeof props.columns === 'undefined') ? 5 : parseInt(props.columns)

    return <>
              <MoorhenGrid columns={columns} gap="5px">
                  {props.cols.map((c,i) => {
                      return (
                         <div key={i}>
                         <MoorhenButton onClick={(e) => props.onClick(c)} variant="white" style={{ padding: 0, minWidth: 0, minHeight: 0, width: size, height: size, borderRadius: '50%' }}>
                         <div style={{ padding: 0, margin: 0, backgroundColor: c, width: size, height: size, borderRadius: '50%' }} />
                         </MoorhenButton>
                         </div>
                       
                      )
                  }) }
              </MoorhenGrid>
           </>
})


