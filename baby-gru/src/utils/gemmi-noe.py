import sys
import pandas as pd
from gemmi import cif

def NOEParser(NEFFile):
    # for path in sys.argv[1:]:
    dict_keys = ["chain1", "res1", "atom1", "chain2", "res2", "atom2"]
    full_noe_dict = []
    for path in NEFFile:
        try:
            doc = cif.read_file(path)  # copy all the data from mmCIF file
            print(doc)
            for block in doc:  # iterate over blocks
                for item in block:
                    for item2 in item.frame:
                        if item2.loop:
                            if any("nef_distance" in element for element in item2.loop.tags):
                                col_headers = item2.loop.tags
                                col_values = item2.loop.values
                                num_col = len(col_headers)
                                each_col_list = [col_values[i:i + num_col] for i in range(0, len(col_values), num_col)]
                                loop_df = pd.DataFrame(each_col_list, columns = col_headers)
                                loop_df = loop_df[["_nef_distance_restraint.chain_code_1",
                                                   "_nef_distance_restraint.sequence_code_1",
                                                   "_nef_distance_restraint.atom_name_1",
                                                   "_nef_distance_restraint.chain_code_2",
                                                   "_nef_distance_restraint.sequence_code_2",
                                                   "_nef_distance_restraint.atom_name_2"]]
                                loop_df.columns = dict_keys
                                loop_dict = loop_df.to_dict(orient = "records")
                                full_noe_dict.append(loop_dict)
        except Exception as e:
            print("Oops. %s" % e)
    print(full_noe_dict)                            



if __name__ == "__main__":
    NOEParser(NEFFile=sys.argv[1:])


# still have ambig restraint issue - how do we deal?
# coot drops them 
# what can we do?
# run through converter again?
# write new converter?

# currently appends all to big list 
# so each key in dictionary = column name
# and each value = entry
# so to call can just use for i in dict? maybe?
# how does previous parser do it?