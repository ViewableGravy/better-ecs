import React from "react";
import { TreeStructure } from "@phosphor-icons/react";
import { Tab } from "@headlessui/react";
import classNames from "classnames";
import styles from "@engine/ui/layout/sidebar/styles.module.css";

export const HierarchyTab: React.FC = () => {
  return (
    <Tab as={React.Fragment}>
      {({ selected }) => {
        const tabButtonClassName = classNames(styles.tabButton, {
          [styles.tabButtonSelected]: selected,
        });

        return (
          <button className={tabButtonClassName}>
            <div className={styles.tabIconSlot}>
              <div className={styles.tabIconLayer}>
                <TreeStructure size={18} color="currentColor" weight="regular" />
              </div>
            </div>
          </button>
        );
      }}
    </Tab>
  );
};
