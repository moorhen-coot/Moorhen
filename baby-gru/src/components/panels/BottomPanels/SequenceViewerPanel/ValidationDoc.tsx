export const validationDoc = <>
<h1>Validation Panel</h1>
<h2>Bonds, Angles, Torsions, Planes and Chiral Volumes</h2>
Z-scores are a measure of how far a particular value is from the mean of a distribution, expressed in terms of standard deviations. 
Values are given per residue as the Root Mean Square of the individual Z-scores. 
The underlying mean and standard deviations are obtained from the CCP4 Monomer Library, which is derived from a database of small molecule structures.
<h2>Ramachandran and Rotamer</h2>
The Ramachandran and rotamer scores assess how common the backbone and side-chain conformations are. 
The Ramachandran score uses the distribution of Phi/Psi pairs and the rotamer score uses the distribution of Chi angles for specific residue types. 
Scores are between 0 and 1 where 1 is the most common conformation. 
Typically, scores above 0.02 are favoured and scores below 0.003 or 0.002 are considered outliers. 
This implementation uses the distributions from the Richardson Top8000 library. 
To put them onto a similar scale to the other geometric distributions, the raw values are converted to a Z-score using the normal cumulative distribution function.
<h2>Correlation coefficients</h2>
All correlation coefficients in this section are Pearson correlation coefficients. 
A value of 1 means a perfect correlation, a value of 0 is no correlation and a value of -1 means perfect anti-correlation. They do not depend on scale and offset.
<h2>Density Correlation (RSCC)</h2>
The correlation coefficient between a map calculated from the model and the experimental 2mFo-DFc map in the region of the residue.
<h2>Q Score</h2>
The Q score is calculated per atom using the correlation coefficient between a fixed-width Gaussian distribution (B-factor is not taken into account) and the map. 
It is therefore a measure of both whether the atom is in the right place and how much individual atomic peaks can be distinguished in the map. Therefore, expect to see higher values for higher resolution maps even when the model is correct in both cases.
<h2>MMRRCC</h2>
Multi-Masked Residue Range Correlation Coefficient<br/>
Is informative of larger trends of fit quality along the chain. 
It is a correlation taken on an 11-residue sliding window, and is less sensitive to local variations.
<h2>B Factors</h2>
The B-factors provide an indication of the relative vibrational mobility of different regions within the structure. 
Atoms with low B-factors (&lt;20 &Aring;&sup2;) are generally located in well-ordered, relatively rigid regions, 
whereas atoms with high B-factors (&gt;50 &Aring;&sup2;) typically occur in more flexible or disordered regions. </>